# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

# JudgeAI — a trustless dispute-resolution protocol.
#
# Two parties each submit their account of events plus evidence. GenLayer
# validators then independently re-run the adjudication: they read the same
# statements, re-fetch the same evidence URLs, and ask an LLM the same
# question. Consensus settles only when validators agree on the deterministic
# verdict fields — the `ruling` enum and the `fault_a` blame bucket.

from genlayer import *

from dataclasses import dataclass
import json
import re


# --- Error taxonomy (validators compare the *class*, not the raw message) ---
ERROR_EXPECTED = "[EXPECTED]"    # business logic, deterministic, must match exactly
ERROR_EXTERNAL = "[EXTERNAL]"    # external 4xx, deterministic, must match exactly
ERROR_TRANSIENT = "[TRANSIENT]"  # network/5xx, non-deterministic, agree if both transient
ERROR_LLM = "[LLM_ERROR]"        # LLM misbehavior, always disagree -> force rotation


# --- Verdict vocabulary (the agreement keys validators must reproduce) ---
RULING_A = "PARTY_A"                       # party A's account prevails
RULING_B = "PARTY_B"                       # party B's account prevails
RULING_SPLIT = "SPLIT"                     # shared fault / both partly right
RULING_INSUFFICIENT = "INSUFFICIENT"       # not enough evidence to decide
VALID_RULINGS = (RULING_A, RULING_B, RULING_SPLIT, RULING_INSUFFICIENT)

STATUS_AWAITING_RESPONSE = "AWAITING_RESPONSE"
STATUS_READY = "READY"
STATUS_RESOLVED = "RESOLVED"

MAX_EVIDENCE_ITEMS = 6
MAX_PAGE_CHARS = 4000


@allow_storage
@dataclass
class Dispute:
    id: str
    title: str
    party_a: str           # filer
    party_b: str           # respondent
    statement_a: str
    statement_b: str
    evidence_a: str        # JSON array of strings (urls or plain text)
    evidence_b: str        # JSON array of strings
    status: str
    ruling: str            # one of VALID_RULINGS once resolved
    fault_a: u256          # 0..100 in steps of 10 — share of fault assigned to A
    credibility_a: u256    # 0..100 credibility score for A
    credibility_b: u256    # 0..100 credibility score for B
    agreed_facts: str
    violation: str
    resolution: str
    reasoning: str
    created_at: str


class JudgeAI(gl.Contract):
    owner: Address
    disputes: TreeMap[str, Dispute]
    dispute_ids: DynArray[str]
    dispute_count: u256

    def __init__(self) -> None:
        self.owner = gl.message.sender_address
        self.dispute_count = u256(0)

    # ------------------------------------------------------------------ reads
    @gl.public.view
    def get_count(self) -> int:
        return len(self.dispute_ids)

    @gl.public.view
    def get_dispute(self, dispute_id: str) -> dict:
        if dispute_id not in self.disputes:
            return {}
        return self._to_dict(self.disputes[dispute_id])

    @gl.public.view
    def list_disputes(self) -> list:
        out = []
        for i in range(len(self.dispute_ids)):
            out.append(self._to_dict(self.disputes[self.dispute_ids[i]]))
        return out

    # ----------------------------------------------------------------- writes
    @gl.public.write
    def file_dispute(
        self,
        title: str,
        statement_a: str,
        evidence_a: str,
        party_b: str,
    ) -> str:
        if not title.strip():
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Title is required")
        if not statement_a.strip():
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Your statement is required")

        evidence_a = self._clean_evidence(evidence_a)
        dispute_id = f"D{int(self.dispute_count) + 1}"
        self.dispute_count = u256(int(self.dispute_count) + 1)

        self.disputes[dispute_id] = Dispute(
            id=dispute_id,
            title=title.strip()[:200],
            party_a=str(gl.message.sender_address),
            party_b=party_b.strip(),
            statement_a=statement_a.strip()[:4000],
            statement_b="",
            evidence_a=evidence_a,
            evidence_b="[]",
            status=STATUS_AWAITING_RESPONSE,
            ruling="",
            fault_a=u256(0),
            credibility_a=u256(0),
            credibility_b=u256(0),
            agreed_facts="",
            violation="",
            resolution="",
            reasoning="",
            created_at=str(gl.message.sender_address),
        )
        self.dispute_ids.append(dispute_id)
        return dispute_id

    @gl.public.write
    def respond(self, dispute_id: str, statement_b: str, evidence_b: str) -> None:
        if dispute_id not in self.disputes:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Unknown dispute")
        d = self.disputes[dispute_id]
        if d.status == STATUS_RESOLVED:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Dispute already resolved")
        if not statement_b.strip():
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Your statement is required")

        d.statement_b = statement_b.strip()[:4000]
        d.evidence_b = self._clean_evidence(evidence_b)
        d.party_b = str(gl.message.sender_address)
        d.status = STATUS_READY

    @gl.public.write
    def adjudicate(self, dispute_id: str) -> None:
        if dispute_id not in self.disputes:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Unknown dispute")
        d = self.disputes[dispute_id]
        if d.status == STATUS_AWAITING_RESPONSE:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Respondent has not replied yet")
        if d.status == STATUS_RESOLVED:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Dispute already resolved")

        verdict_json = self._adjudicate(
            d.title,
            d.statement_a,
            d.statement_b,
            d.evidence_a,
            d.evidence_b,
        )
        verdict = json.loads(verdict_json)

        d.ruling = verdict["ruling"]
        d.fault_a = u256(int(verdict["fault_a"]))
        d.credibility_a = u256(int(verdict["credibility_a"]))
        d.credibility_b = u256(int(verdict["credibility_b"]))
        d.agreed_facts = verdict["agreed_facts"]
        d.violation = verdict["violation"]
        d.resolution = verdict["resolution"]
        d.reasoning = verdict["reasoning"]
        d.status = STATUS_RESOLVED

    # ------------------------------------------------- Optimistic Democracy
    def _adjudicate(
        self,
        title: str,
        statement_a: str,
        statement_b: str,
        evidence_a: str,
        evidence_b: str,
    ) -> str:
        def leader_fn() -> str:
            # Build the prompt *inside* the consensus block so validators
            # re-fetch every evidence URL themselves rather than trusting one.
            prompt = self._build_prompt(
                title, statement_a, statement_b, evidence_a, evidence_b
            )
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            return _normalize_verdict(raw)

        def validator_fn(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return _handle_leader_error(leaders_res, leader_fn)

            # Independently re-run the judgment and compare the decision fields.
            try:
                validator_json = leader_fn()
            except gl.vm.UserError:
                return False

            try:
                leader = json.loads(leaders_res.calldata)
                validator = json.loads(validator_json)
            except Exception:
                return False

            # 1. Ruling must match exactly.
            if leader.get("ruling") != validator.get("ruling"):
                return False

            # 2. Fault share must land in the same/adjacent 10-point bucket.
            if abs(int(leader.get("fault_a", -100)) - int(validator.get("fault_a", 100))) > 10:
                return False

            # 3. Credibility ordering must agree (who is more credible).
            if _cred_order(leader) != _cred_order(validator):
                return False

            return True

        return gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

    def _build_prompt(
        self,
        title: str,
        statement_a: str,
        statement_b: str,
        evidence_a: str,
        evidence_b: str,
    ) -> str:
        ev_a = self._render_evidence(evidence_a)
        ev_b = self._render_evidence(evidence_b)
        return (
            "You are an impartial arbiter resolving a dispute between two parties, "
            "PARTY_A and PARTY_B. Weigh each side's account against their evidence. "
            "Judge credibility, identify agreed-upon facts, determine who (if anyone) "
            "violated the agreement, and propose a fair resolution.\n\n"
            f"DISPUTE TITLE:\n{title}\n\n"
            f"PARTY_A STATEMENT:\n{statement_a}\n\n"
            f"PARTY_A EVIDENCE:\n{ev_a}\n\n"
            f"PARTY_B STATEMENT:\n{statement_b}\n\n"
            f"PARTY_B EVIDENCE:\n{ev_b}\n\n"
            "Decide a `ruling`:\n"
            '- "PARTY_A": A\'s account is the more credible / correct one.\n'
            '- "PARTY_B": B\'s account is the more credible / correct one.\n'
            '- "SPLIT": both share responsibility / each is partly right.\n'
            '- "INSUFFICIENT": evidence is too weak to decide.\n\n'
            "Also assign `fault_a`: the share of fault attributable to PARTY_A as an "
            "integer from 0 to 100 rounded to the nearest 10 (0 = entirely B's fault, "
            "100 = entirely A's fault, 50 = shared).\n"
            "Assign `credibility_a` and `credibility_b`: each party's credibility "
            "from 0 to 100 rounded to the nearest 10.\n\n"
            "Respond with ONLY compact JSON, no markdown, with exactly these keys:\n"
            '{"ruling": "PARTY_A|PARTY_B|SPLIT|INSUFFICIENT", '
            '"fault_a": <0-100>, "credibility_a": <0-100>, "credibility_b": <0-100>, '
            '"agreed_facts": "<one sentence>", "violation": "<who violated what, one sentence>", '
            '"resolution": "<the fair resolution, one or two sentences>", '
            '"reasoning": "<one sentence justifying the ruling>"}'
        )

    def _render_evidence(self, evidence_json: str) -> str:
        try:
            items = json.loads(evidence_json)
        except Exception:
            items = []
        if not items:
            return "(no evidence submitted)"

        rendered = []
        for raw in items[:MAX_EVIDENCE_ITEMS]:
            item = str(raw).strip()
            if item.startswith("http://") or item.startswith("https://"):
                rendered.append(f"[link {item}]\n{self._fetch(item)}")
            else:
                rendered.append(item[:MAX_PAGE_CHARS])
        return "\n\n".join(rendered)

    def _fetch(self, url: str) -> str:
        try:
            page = gl.nondet.web.render(url, mode="text")
            return str(page)[:MAX_PAGE_CHARS]
        except Exception:
            # A fetch failure on one validator must not masquerade as a different
            # verdict — degrade to a stable placeholder for all.
            return "(evidence link could not be retrieved)"

    # ----------------------------------------------------------------- helpers
    def _clean_evidence(self, evidence_json: str) -> str:
        try:
            items = json.loads(evidence_json)
            if not isinstance(items, list):
                items = []
        except Exception:
            items = []
        cleaned = [str(x).strip()[:MAX_PAGE_CHARS] for x in items if str(x).strip()]
        return json.dumps(cleaned[:MAX_EVIDENCE_ITEMS])

    def _to_dict(self, d: Dispute) -> dict:
        return {
            "id": d.id,
            "title": d.title,
            "party_a": d.party_a,
            "party_b": d.party_b,
            "statement_a": d.statement_a,
            "statement_b": d.statement_b,
            "evidence_a": d.evidence_a,
            "evidence_b": d.evidence_b,
            "status": d.status,
            "ruling": d.ruling,
            "fault_a": int(d.fault_a),
            "credibility_a": int(d.credibility_a),
            "credibility_b": int(d.credibility_b),
            "agreed_facts": d.agreed_facts,
            "violation": d.violation,
            "resolution": d.resolution,
            "reasoning": d.reasoning,
        }


# --------------------------------------------------------- module-level helpers
def _cred_order(v: dict) -> str:
    """Reduce credibility scores to who-leads, the stable comparison key."""
    a = int(v.get("credibility_a", 0))
    b = int(v.get("credibility_b", 0))
    if a > b:
        return "A"
    if b > a:
        return "B"
    return "TIE"


def _normalize_verdict(raw) -> str:
    """Coerce a noisy LLM response into a stable, comparable JSON shape."""
    obj = _coerce_dict(raw)

    ruling = str(obj.get("ruling", "")).strip().upper()
    if ruling not in VALID_RULINGS:
        # Tolerate common variants before giving up.
        if ruling in ("A", "PARTYA", "PARTY A"):
            ruling = RULING_A
        elif ruling in ("B", "PARTYB", "PARTY B"):
            ruling = RULING_B
        elif ruling in ("TIE", "BOTH", "SHARED"):
            ruling = RULING_SPLIT
        else:
            ruling = RULING_INSUFFICIENT

    verdict = {
        "ruling": ruling,
        "fault_a": _bucket(obj.get("fault_a")),
        "credibility_a": _bucket(obj.get("credibility_a")),
        "credibility_b": _bucket(obj.get("credibility_b")),
        "agreed_facts": str(obj.get("agreed_facts", ""))[:400],
        "violation": str(obj.get("violation", ""))[:400],
        "resolution": str(obj.get("resolution", ""))[:600],
        "reasoning": str(obj.get("reasoning", ""))[:400],
    }
    return json.dumps(verdict, sort_keys=True)


def _coerce_dict(raw) -> dict:
    if isinstance(raw, dict):
        return raw
    text = str(raw)
    first = text.find("{")
    last = text.rfind("}")
    if first == -1 or last == -1:
        raise gl.vm.UserError(f"{ERROR_LLM} Verdict was not JSON")
    text = text[first : last + 1]
    text = re.sub(r",(?!\s*?[\{\[\"\'\w])", "", text)
    try:
        obj = json.loads(text)
    except Exception:
        raise gl.vm.UserError(f"{ERROR_LLM} Verdict JSON could not be parsed")
    if not isinstance(obj, dict):
        raise gl.vm.UserError(f"{ERROR_LLM} Verdict was not an object")
    return obj


def _bucket(raw) -> int:
    """Round a 0..100 value to the nearest 10 so validators land together."""
    try:
        val = float(str(raw).strip().rstrip("%"))
    except (ValueError, TypeError):
        val = 0.0
    val = max(0.0, min(100.0, val))
    return int(round(val / 10.0) * 10)


def _handle_leader_error(leaders_res, leader_fn) -> bool:
    leader_msg = leaders_res.message if hasattr(leaders_res, "message") else ""
    try:
        leader_fn()
        return False  # leader errored, validator succeeded -> disagree
    except gl.vm.UserError as e:
        validator_msg = e.message if hasattr(e, "message") else str(e)
        if validator_msg.startswith(ERROR_EXPECTED) or validator_msg.startswith(ERROR_EXTERNAL):
            return validator_msg == leader_msg
        if validator_msg.startswith(ERROR_TRANSIENT) and leader_msg.startswith(ERROR_TRANSIENT):
            return True
        return False
    except Exception:
        return False
