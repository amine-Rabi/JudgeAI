'use client';

import { useState } from 'react';

// Evidence is a list of strings: a URL (validators re-fetch it) or plain text.
export default function EvidenceInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...value, v].slice(0, 6));
    setDraft('');
  };

  return (
    <div>
      <label>Evidence — links or quoted facts (up to 6)</label>
      <div style={{ display: 'flex', gap: '0.6rem' }}>
        <input
          value={draft}
          placeholder="https://… or a quoted message"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn" data-magnetic onClick={add} disabled={value.length >= 6}>
          Add
        </button>
      </div>
      {value.length > 0 && (
        <ul style={{ listStyle: 'none', marginTop: '0.7rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {value.map((ev, i) => (
            <li
              key={i}
              className="mono"
              style={{
                fontSize: '0.64rem',
                color: 'var(--bone-dim)',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '1rem',
                borderBottom: '1px solid var(--line)',
                paddingBottom: '0.3rem',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ev.startsWith('http') ? '↗ ' : '“ '}
                {ev}
              </span>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                style={{ background: 'none', border: 'none', color: 'var(--ember)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
