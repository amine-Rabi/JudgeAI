'use client';

import { useState } from 'react';
import Balance from './Balance';
import VerdictSeal from './VerdictSeal';
import EvidenceInput from './EvidenceInput';
import type { Dispute } from '@/lib/genlayer';
import { parseEvidence } from '@/lib/genlayer';

function short(addr: string) {
  if (!addr) return '—';
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

const STATUS_LABEL: Record<Dispute['status'], string> = {
  AWAITING_RESPONSE: 'Awaiting respondent',
  READY: 'Ready to adjudicate',
  RESOLVED: 'Resolved',
};

interface Props {
  dispute: Dispute;
  busy: boolean;
  onRespond: (id: string, statement: string, evidence: string[]) => void;
  onAdjudicate: (id: string) => void;
}

export default function DisputeCard({ dispute: d, busy, onRespond, onAdjudicate }: Props) {
  const [open, setOpen] = useState(false);
  const [statement, setStatement] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);

  const evA = parseEvidence(d.evidence_a);
  const evB = parseEvidence(d.evidence_b);

  return (
    <article
      style={{
        border: '1px solid var(--line)',
        background: 'var(--obsidian-2)',
        borderRadius: 3,
        padding: 'clamp(1.2rem, 3vw, 2rem)',
        marginBottom: '1.5rem',
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <span className="mono">
            Case {d.id} · {STATUS_LABEL[d.status]}
          </span>
          <h3 className="display" style={{ fontSize: 'clamp(1.3rem,3vw,1.9rem)', marginTop: '0.4rem' }}>
            {d.title}
          </h3>
        </div>
        <div className="mono" style={{ textAlign: 'right', lineHeight: 1.9 }}>
          <div>
            <span style={{ color: 'var(--verdigris)' }}>A</span> {short(d.party_a)}
          </div>
          <div>
            <span style={{ color: 'var(--ember)' }}>B</span> {short(d.party_b)}
          </div>
        </div>
      </header>

      {/* statements */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.4rem' }}>
        <Side color="var(--verdigris)" label="Party A states" body={d.statement_a} evidence={evA} />
        <Side
          color="var(--ember)"
          label="Party B states"
          body={d.statement_b || '(no response yet)'}
          evidence={evB}
        />
      </div>

      {/* resolved verdict */}
      {d.status === 'RESOLVED' && (
        <div
          style={{
            marginTop: '1.8rem',
            paddingTop: '1.8rem',
            borderTop: '1px solid var(--line)',
            display: 'grid',
            gridTemplateColumns: 'minmax(220px, 1fr) 1.4fr',
            gap: '1.5rem',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Balance faultA={d.fault_a} resolved size={300} />
            <VerdictSeal ruling={d.ruling} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <Finding label="Agreed facts" body={d.agreed_facts} />
            <Finding label="Violation" body={d.violation} color="var(--ember)" />
            <Finding label="Fair resolution" body={d.resolution} color="var(--brass)" />
            <Finding label="Reasoning" body={d.reasoning} />
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.4rem' }}>
              <Metric label="Credibility A" value={d.credibility_a} color="var(--verdigris)" />
              <Metric label="Credibility B" value={d.credibility_b} color="var(--ember)" />
              <Metric label="Fault A" value={d.fault_a} color="var(--brass)" />
            </div>
          </div>
        </div>
      )}

      {/* actions */}
      <footer style={{ marginTop: '1.6rem', display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
        {d.status === 'AWAITING_RESPONSE' && (
          <button className="btn" data-magnetic onClick={() => setOpen((o) => !o)}>
            {open ? 'Cancel response' : 'Respond as Party B'}
          </button>
        )}
        {d.status === 'READY' && (
          <button
            className="btn btn-solid"
            data-magnetic
            disabled={busy}
            onClick={() => onAdjudicate(d.id)}
          >
            {busy ? 'Validators deciding…' : 'Submit to the tribunal'}
          </button>
        )}
      </footer>

      {open && d.status === 'AWAITING_RESPONSE' && (
        <div style={{ marginTop: '1.4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label>Your account of events</label>
            <textarea rows={4} value={statement} onChange={(e) => setStatement(e.target.value)} />
          </div>
          <EvidenceInput value={evidence} onChange={setEvidence} />
          <button
            className="btn btn-solid"
            data-magnetic
            disabled={busy || !statement.trim()}
            onClick={() => onRespond(d.id, statement, evidence)}
          >
            {busy ? 'Submitting…' : 'File response'}
          </button>
        </div>
      )}
    </article>
  );
}

function Side({ color, label, body, evidence }: { color: string; label: string; body: string; evidence: string[] }) {
  return (
    <div style={{ borderLeft: `2px solid ${color}`, paddingLeft: '0.9rem' }}>
      <span className="mono" style={{ color }}>
        {label}
      </span>
      <p style={{ marginTop: '0.5rem', color: 'var(--bone)', fontSize: '0.92rem' }}>{body}</p>
      {evidence.length > 0 && (
        <ul style={{ listStyle: 'none', marginTop: '0.7rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {evidence.map((ev, i) => (
            <li key={i} className="mono" style={{ fontSize: '0.62rem', color: 'var(--bone-dim)' }}>
              {ev.startsWith('http') ? (
                <a href={ev} target="_blank" rel="noreferrer" style={{ color: 'var(--brass)' }}>
                  ↗ {ev.length > 38 ? ev.slice(0, 38) + '…' : ev}
                </a>
              ) : (
                <span>“{ev.length > 60 ? ev.slice(0, 60) + '…' : ev}”</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Finding({ label, body, color = 'var(--bone)' }: { label: string; body: string; color?: string }) {
  if (!body) return null;
  return (
    <div>
      <span className="mono" style={{ color }}>
        {label}
      </span>
      <p style={{ marginTop: '0.2rem', fontSize: '0.92rem' }}>{body}</p>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="display" style={{ fontSize: '1.8rem', color }}>
        {value}
      </div>
      <span className="mono" style={{ fontSize: '0.6rem' }}>
        {label}
      </span>
    </div>
  );
}
