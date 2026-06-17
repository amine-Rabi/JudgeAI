# JudgeAI — Trustless Dispute Resolution

Two people disagree. Each submits their account of events and their evidence
(links, quoted messages, documents). A panel of GenLayer validators then reads
the same record and **independently** arrives at the same verdict — who is more
credible, what facts are agreed, who violated the agreement, and what a fair
resolution looks like.

There is no judge and no middleman. The decision is settled by **Optimistic
Democracy**: a leader proposes a ruling, validators re-run the exact same
adjudication, and consensus only settles when they agree on the deterministic
verdict fields.

## How the consensus works

The trust-critical decision lives entirely inside the intelligent contract:

1. **Inputs** — both parties' statements plus their evidence (each evidence URL
   is re-fetched by every validator, never trusted from a single source).
2. **Judgment** — an LLM weighs credibility, agreed facts, violation, and a fair
   resolution, returning a structured verdict.
3. **Normalization** — the verdict is reduced to small, comparable fields:
   - `ruling` — `PARTY_A | PARTY_B | SPLIT | INSUFFICIENT`
   - `fault_a` — share of fault assigned to Party A, bucketed to the nearest 10
   - credibility scores per party
4. **Agreement** — validators independently re-run the judgment and must agree
   on the ruling, the fault bucket (within one step), and who is more credible.
   Errors are classified deterministically so a transient fetch failure never
   masquerades as a disagreement.

## Project layout

```
contracts/judge.py        # the intelligent contract (Optimistic Democracy)
tests/direct/             # fast in-memory contract tests
scripts/deploy.mjs        # deploy to the Bradbury testnet
web/                      # Next.js frontend (Vercel root directory)
```

## Develop & test the contract

```bash
pip install genvm-linter genlayer-test
genvm-lint check contracts/judge.py
pytest -q
```

## Deploy the contract

```bash
cp .env.example .env        # set DEPLOYER_PRIVATE_KEY (fund it on Bradbury first)
npm install
npm run deploy              # prints the deployed contract address
```

Put the printed address into `web/.env.local` as `NEXT_PUBLIC_CONTRACT_ADDRESS`.

## Run the frontend

```bash
cd web
npm install
npm run dev
```

Set these environment variables (locally in `web/.env.local`, and in your
hosting provider for production):

- `NEXT_PUBLIC_CONTRACT_ADDRESS` — the deployed contract address
- `NEXT_PUBLIC_GENLAYER_NETWORK` — `testnetBradbury`

With no contract configured the app runs in **preview mode**, showing sample
cases so you can explore the interface; live filing and adjudication require a
deployed contract and a connected wallet.

## Deploy the frontend

Import the repository into your hosting provider with **root directory `web/`**,
framework preset **Next.js**, and the two `NEXT_PUBLIC_*` variables set at build
time.

---

Built on GenLayer. Verdicts are settled by validator consensus on the Bradbury
testnet.
