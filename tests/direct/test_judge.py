import json

CONTRACT = "contracts/judge.py"


def _verdict(ruling="PARTY_A", fault_a=20, cred_a=80, cred_b=40):
    return json.dumps(
        {
            "ruling": ruling,
            "fault_a": fault_a,
            "credibility_a": cred_a,
            "credibility_b": cred_b,
            "agreed_facts": "Both agree a contract existed.",
            "violation": "Party B missed the agreed deadline.",
            "resolution": "Party B refunds 50% of the deposit.",
            "reasoning": "B's evidence does not rebut A's timeline.",
        }
    )


def test_file_and_read_dispute(direct_vm, direct_deploy, direct_alice):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice

    did = c.file_dispute("Late delivery", "They delivered two weeks late.", "[]", "0xBOB")
    assert did == "D1"
    assert c.get_count() == 1

    d = c.get_dispute("D1")
    assert d["status"] == "AWAITING_RESPONSE"
    assert d["title"] == "Late delivery"
    assert d["ruling"] == ""


def test_respond_moves_to_ready(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    c.file_dispute("Dispute", "A statement", "[]", str(direct_bob))

    direct_vm.sender = direct_bob
    c.respond("D1", "B disagrees", "[]")

    d = c.get_dispute("D1")
    assert d["status"] == "READY"
    assert d["statement_b"] == "B disagrees"


def test_cannot_adjudicate_before_response(direct_vm, direct_deploy, direct_alice):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    c.file_dispute("Dispute", "A statement", "[]", "0xBOB")

    with direct_vm.expect_revert("Respondent has not replied yet"):
        c.adjudicate("D1")


def test_full_adjudication_flow(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = direct_deploy(CONTRACT)
    direct_vm.mock_llm(r".*impartial arbiter.*", _verdict("PARTY_A", 20, 80, 40))

    direct_vm.sender = direct_alice
    c.file_dispute("Unpaid invoice", "B never paid the final invoice.", "[]", str(direct_bob))

    direct_vm.sender = direct_bob
    c.respond("D1", "The work was incomplete.", "[]")

    c.adjudicate("D1")

    d = c.get_dispute("D1")
    assert d["status"] == "RESOLVED"
    assert d["ruling"] == "PARTY_A"
    assert d["fault_a"] == 20
    assert d["credibility_a"] == 80
    assert d["credibility_b"] == 40
    assert "refunds" in d["resolution"]


def test_verdict_is_normalized_and_bucketed(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = direct_deploy(CONTRACT)
    # Noisy LLM output: lowercase ruling, odd numbers, markdown wrapper.
    noisy = "```json\n" + json.dumps(
        {
            "ruling": "party b",
            "fault_a": 73,
            "credibility_a": 41,
            "credibility_b": 88,
            "agreed_facts": "x",
            "violation": "y",
            "resolution": "z",
            "reasoning": "r",
        }
    ) + "\n```"
    direct_vm.mock_llm(r".*impartial arbiter.*", noisy)

    direct_vm.sender = direct_alice
    c.file_dispute("Boundary fence", "Fence is on my land.", "[]", str(direct_bob))
    direct_vm.sender = direct_bob
    c.respond("D1", "Survey says otherwise.", "[]")
    c.adjudicate("D1")

    d = c.get_dispute("D1")
    assert d["ruling"] == "PARTY_B"      # "party b" normalized
    assert d["fault_a"] == 70            # 73 -> nearest 10
    assert d["credibility_a"] == 40      # 41 -> nearest 10
    assert d["credibility_b"] == 90      # 88 -> nearest 10


def test_evidence_urls_are_fetched(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = direct_deploy(CONTRACT)
    direct_vm.mock_web(r".*example\.com/contract.*", {"status": 200, "body": "Deadline: March 1."})
    direct_vm.mock_llm(r".*Deadline: March 1.*", _verdict("PARTY_A", 10, 90, 30))

    direct_vm.sender = direct_alice
    c.file_dispute(
        "Contract breach",
        "The deadline was clearly March 1.",
        json.dumps(["https://example.com/contract"]),
        str(direct_bob),
    )
    direct_vm.sender = direct_bob
    c.respond("D1", "I thought it was April.", "[]")
    c.adjudicate("D1")

    d = c.get_dispute("D1")
    assert d["ruling"] == "PARTY_A"
    assert d["fault_a"] == 10


def test_empty_title_reverts(direct_vm, direct_deploy, direct_alice):
    c = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Title is required"):
        c.file_dispute("   ", "statement", "[]", "0xBOB")
