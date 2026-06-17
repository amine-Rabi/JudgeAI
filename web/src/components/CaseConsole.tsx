'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import DisputeCard from './DisputeCard';
import EvidenceInput from './EvidenceInput';
import ConsensusTally from './ConsensusTally';
import Balance from './Balance';
import {
  HAS_CONTRACT,
  connectWallet,
  listDisputes,
  fileDispute,
  respondToDispute,
  adjudicate,
  type Dispute,
} from '@/lib/genlayer';

const DEMO: Dispute[] = [
  {
    id: 'D1',
    title: 'Deposit withheld after early move-out',
    party_a: '0xTENANT00000000000000000000000000000000a1',
    party_b: '0xLANDLORD000000000000000000000000000000b2',
    statement_a: 'I left the flat spotless and gave 30 days notice. The deposit was never returned.',
    statement_b: 'There was paint damage on two walls and notice arrived late by email.',
    evidence_a: '["https://example.com/move-out-photos","Notice email sent on the 1st"]',
    evidence_b: '["Repaint invoice: $240"]',
    status: 'RESOLVED',
    ruling: 'SPLIT',
    fault_a: 30,
    credibility_a: 70,
    credibility_b: 60,
    agreed_facts: 'A tenancy existed and a deposit of $1,200 was held.',
    violation: 'Landlord withheld the full deposit without itemised deductions; tenant left minor wall damage.',
    resolution: 'Return $960 to the tenant; landlord retains $240 for documented repainting.',
    reasoning: 'Photos support a clean handover, but the repaint invoice is credible and specific.',
  },
  {
    id: 'D2',
    title: 'Freelance logo — “unlimited revisions” dispute',
    party_a: '0xCLIENT00000000000000000000000000000000c3',
    party_b: '0xDESIGNER0000000000000000000000000000000d4',
    statement_a: 'The contract promised unlimited revisions; the designer stopped after three.',
    statement_b: '',
    evidence_a: '["https://example.com/contract-thread"]',
    evidence_b: '[]',
    status: 'AWAITING_RESPONSE',
    ruling: '',
    fault_a: 0,
    credibility_a: 0,
    credibility_b: 0,
    agreed_facts: '',
    violation: '',
    resolution: '',
    reasoning: '',
  },
];

export default function CaseConsole() {
  const [wallet, setWallet] = useState<`0x${string}` | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<{ active: boolean; target: number } | null>(null);
  const [tab, setTab] = useState<'docket' | 'file'>('docket');

  // file form
  const [title, setTitle] = useState('');
  const [statement, setStatement] = useState('');
  const [partyB, setPartyB] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    if (!HAS_CONTRACT) {
      setDisputes(DEMO);
      return;
    }
    try {
      const list = await listDisputes();
      setDisputes(list.length ? list.reverse() : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the docket.');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const connect = async () => {
    setError('');
    try {
      setWallet(await connectWallet());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Wallet connection failed.');
    }
  };

  const guardWallet = async (): Promise<`0x${string}` | null> => {
    if (wallet) return wallet;
    try {
      const w = await connectWallet();
      setWallet(w);
      return w;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connect a wallet to act on a case.');
      return null;
    }
  };

  const onFile = async () => {
    setError('');
    const w = await guardWallet();
    if (!w) return;
    if (!HAS_CONTRACT) {
      setError('Preview mode: deploy the contract and set NEXT_PUBLIC_CONTRACT_ADDRESS to file real cases.');
      return;
    }
    setBusyId('__file');
    try {
      await fileDispute(w, title, statement, evidence, partyB);
      setTitle('');
      setStatement('');
      setPartyB('');
      setEvidence([]);
      setTab('docket');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Filing failed.');
    } finally {
      setBusyId(null);
    }
  };

  const onRespond = async (id: string, s: string, ev: string[]) => {
    setError('');
    const w = await guardWallet();
    if (!w || !HAS_CONTRACT) {
      if (!HAS_CONTRACT) setError('Preview mode — responses are disabled until a contract is deployed.');
      return;
    }
    setBusyId(id);
    try {
      await respondToDispute(w, id, s, ev);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Response failed.');
    } finally {
      setBusyId(null);
    }
  };

  const onAdjudicate = async (id: string) => {
    setError('');
    const w = await guardWallet();
    if (!w || !HAS_CONTRACT) {
      if (!HAS_CONTRACT) setError('Preview mode — adjudication runs on the deployed contract only.');
      return;
    }
    setBusyId(id);
    setPending({ active: true, target: 50 });
    try {
      await adjudicate(w, id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Adjudication failed.');
    } finally {
      setBusyId(null);
      setPending(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Tab active={tab === 'docket'} onClick={() => setTab('docket')}>
            The docket
          </Tab>
          <Tab active={tab === 'file'} onClick={() => setTab('file')}>
            File a case
          </Tab>
        </div>
        <button className="btn" data-magnetic onClick={connect}>
          {wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : 'Connect wallet'}
        </button>
      </div>

      {!HAS_CONTRACT && (
        <p className="mono" style={{ color: 'var(--brass)', marginBottom: '1.5rem' }}>
          ◆ Preview mode — showing sample cases. Deploy the contract and set NEXT_PUBLIC_CONTRACT_ADDRESS for live adjudication.
        </p>
      )}
      {error && (
        <p className="mono" style={{ color: 'var(--ember)', marginBottom: '1.5rem' }}>
          {error}
        </p>
      )}

      {tab === 'file' ? (
        <div style={{ maxWidth: 620, display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <label>Dispute title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What is the disagreement about?" />
          </div>
          <div>
            <label>Your account of events</label>
            <textarea rows={5} value={statement} onChange={(e) => setStatement(e.target.value)} />
          </div>
          <EvidenceInput value={evidence} onChange={setEvidence} />
          <div>
            <label>Respondent address (Party B)</label>
            <input value={partyB} onChange={(e) => setPartyB(e.target.value)} placeholder="0x…" />
          </div>
          <button
            className="btn btn-solid"
            data-magnetic
            disabled={busyId === '__file' || !title.trim() || !statement.trim()}
            onClick={onFile}
          >
            {busyId === '__file' ? 'Filing…' : 'Open the case'}
          </button>
        </div>
      ) : (
        <div>
          {disputes.length === 0 ? (
            <p className="mono" style={{ color: 'var(--bone-dim)' }}>
              The docket is empty. File the first case.
            </p>
          ) : (
            disputes.map((d) => (
              <DisputeCard
                key={d.id}
                dispute={d}
                busy={busyId === d.id}
                onRespond={onRespond}
                onAdjudicate={onAdjudicate}
              />
            ))
          )}
        </div>
      )}

      <AnimatePresence>
        {pending?.active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 800,
              background: 'rgba(14,14,12,0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
            }}
          >
            <div style={{ width: 'min(560px, 100%)', textAlign: 'center' }}>
              <Balance faultA={50} live size={300} />
              <h3 className="display" style={{ fontSize: '1.6rem', margin: '1rem 0 2rem' }}>
                The tribunal is deliberating
              </h3>
              <ConsensusTally target={pending.target} />
              <p className="mono" style={{ marginTop: '1.5rem' }}>
                Validators independently re-run the judgment · consensus settles on the ruling
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="mono"
      style={{
        background: 'none',
        border: 'none',
        borderBottom: `1px solid ${active ? 'var(--brass)' : 'transparent'}`,
        color: active ? 'var(--brass)' : 'var(--bone-dim)',
        cursor: 'pointer',
        padding: '0.4rem 0.2rem',
      }}
    >
      {children}
    </button>
  );
}
