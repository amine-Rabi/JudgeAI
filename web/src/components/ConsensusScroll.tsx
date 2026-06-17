'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger, registerGsap, prefersReducedMotion } from '@/lib/motion';

const VALIDATORS = ['0x4f', '0xa1', '0x8c', '0x2e', '0xd7'];
// scattered start -> converged near 30 (fault → B)
const START = [12, 64, 38, 88, 22];
const END = [30, 30, 40, 20, 30];

// A pinned, scrubbed moment: as you scroll, five validators that started in
// disagreement converge into the tolerance band and the verdict settles.
export default function ConsensusScroll() {
  const root = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(prefersReducedMotion() ? 1 : 0);

  useEffect(() => {
    registerGsap();
    const el = root.current;
    if (!el || prefersReducedMotion()) return;

    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: '+=1600',
      pin: true,
      scrub: 0.6,
      onUpdate: (self) => setProgress(self.progress),
    });
    return () => st.kill();
  }, []);

  const positions = VALIDATORS.map((_, i) => START[i] + (END[i] - START[i]) * progress);
  const settled = progress > 0.85;

  return (
    <div ref={root} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <div className="shell" style={{ width: '100%' }}>
        <span className="eyebrow">How consensus settles</span>
        <h2 className="display" style={{ fontSize: 'clamp(1.8rem,5vw,3.4rem)', maxWidth: 720, margin: '1rem 0 2.5rem' }}>
          Five validators. One verdict, reproduced independently.
        </h2>

        <div
          style={{
            position: 'relative',
            height: 280,
            border: '1px solid var(--line)',
            background: 'var(--obsidian-2)',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          {/* tolerance band */}
          <div
            style={{
              position: 'absolute',
              left: '18%',
              width: '24%',
              top: 0,
              bottom: 0,
              background: 'rgba(255,91,46,0.07)',
              borderLeft: '1px dashed var(--line-strong)',
              borderRight: '1px dashed var(--line-strong)',
            }}
          />
          <span className="mono" style={{ position: 'absolute', left: '18%', top: 8, color: 'var(--brass)' }}>
            tolerance ±10
          </span>

          {VALIDATORS.map((v, i) => (
            <div
              key={v}
              style={{
                position: 'absolute',
                left: `calc(${positions[i]}% - 40px)`,
                top: 52 + i * 40,
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                color: settled ? 'var(--verdigris)' : 'var(--bone)',
                transition: 'color 0.4s',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: 'var(--brass)' }}>◆</span> {v} · {Math.round(positions[i])}%
            </div>
          ))}

          <div
            style={{
              position: 'absolute',
              bottom: 14,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontFamily: 'var(--font-display)',
              fontSize: '1.4rem',
              color: settled ? 'var(--verdigris)' : 'var(--slate)',
              transition: 'color 0.4s',
            }}
          >
            {settled ? 'CONSENSUS — ruling: Party B' : 'deliberating…'}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.8rem' }}>
          <span className="mono" style={{ color: 'var(--ember)' }}>fault → B</span>
          <span className="mono" style={{ color: 'var(--verdigris)' }}>fault → A</span>
        </div>
      </div>
    </div>
  );
}
