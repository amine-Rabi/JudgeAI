'use client';

import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

interface Validator {
  id: string;
  fault: number;
  ruling: string;
  landed: boolean;
}

const SEED = ['0x4f', '0xa1', '0x8c', '0x2e', '0xd7'];

// A live tally: independent validators each post an estimate; they converge
// inside a tolerance band. This encodes the real mechanic, not decoration.
export default function ConsensusTally({ target = 30, label = 'Validators deliberating' }: { target?: number; label?: string }) {
  const [vals, setVals] = useState<Validator[]>(
    SEED.map((id) => ({ id, fault: 50, ruling: '—', landed: false }))
  );

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const final = SEED.map((id, i) => ({
      id,
      // validators scatter around the target, then are shown as landed
      fault: Math.max(0, Math.min(100, Math.round((target + (i - 2) * 6) / 10) * 10)),
      ruling: target < 40 ? 'B' : target > 60 ? 'A' : 'SPLIT',
      landed: true,
    }));

    if (reduced) {
      setVals(final);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    SEED.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          setVals((prev) => prev.map((v, j) => (j === i ? final[i] : v)));
        }, 500 + i * 420)
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [target]);

  const landedCount = vals.filter((v) => v.landed).length;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span className="mono">{label}</span>
        <span className="mono" style={{ color: 'var(--brass)' }}>
          {landedCount}/{SEED.length} cast
        </span>
      </div>

      <div style={{ position: 'relative', height: 84, borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        {/* tolerance band */}
        <div
          style={{
            position: 'absolute',
            left: `${Math.max(0, target - 12)}%`,
            width: '24%',
            top: 0,
            bottom: 0,
            background: 'rgba(255,91,46,0.08)',
            borderLeft: '1px dashed var(--line-strong)',
            borderRight: '1px dashed var(--line-strong)',
          }}
        />
        {vals.map((v, i) => (
          <div
            key={v.id}
            style={{
              position: 'absolute',
              left: `calc(${v.landed ? v.fault : 50}% - 18px)`,
              top: 12 + i * 13,
              transition: 'left 0.9s cubic-bezier(0.16,1,0.3,1), opacity 0.5s',
              opacity: v.landed ? 1 : 0.25,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.62rem',
              color: v.landed ? 'var(--bone)' : 'var(--slate)',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: 'var(--brass)' }}>◆</span> {v.id}
            <span style={{ color: 'var(--bone-dim)' }}> · {v.landed ? `${v.fault}%` : '··'}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.6rem' }}>
        <span className="mono" style={{ color: 'var(--ember)' }}>fault → B</span>
        <span className="mono">tolerance ±10</span>
        <span className="mono" style={{ color: 'var(--verdigris)' }}>fault → A</span>
      </div>
    </div>
  );
}
