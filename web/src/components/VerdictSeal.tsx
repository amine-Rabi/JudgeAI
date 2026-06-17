'use client';

import { useEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/motion';
import type { Ruling } from '@/lib/genlayer';

const LABELS: Record<string, { word: string; color: string }> = {
  PARTY_A: { word: 'For Party A', color: 'var(--verdigris)' },
  PARTY_B: { word: 'For Party B', color: 'var(--ember)' },
  SPLIT: { word: 'Shared Fault', color: 'var(--brass)' },
  INSUFFICIENT: { word: 'Insufficient', color: 'var(--slate)' },
};

// The cinematic payoff: the verdict seal stamps in — scale + rotate snap, never
// a static text swap.
export default function VerdictSeal({ ruling }: { ruling: Ruling }) {
  const ref = useRef<HTMLDivElement>(null);
  const meta = LABELS[ruling] || LABELS.INSUFFICIENT;

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const tl = gsap.timeline();
    tl.fromTo(
      el,
      { scale: 2.4, rotate: -14, autoAlpha: 0 },
      { scale: 1, rotate: -6, autoAlpha: 1, duration: 0.55, ease: 'back.out(2.2)' }
    ).fromTo(
      el.querySelector('.seal-ring'),
      { scale: 1.3, autoAlpha: 0 },
      { scale: 1, autoAlpha: 1, duration: 0.4, ease: 'power2.out' },
      '-=0.2'
    );
  }, [ruling]);

  return (
    <div
      ref={ref}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '1.4rem 2rem',
        transform: 'rotate(-6deg)',
      }}
    >
      <div
        className="seal-ring"
        style={{
          position: 'absolute',
          inset: 0,
          border: `2px solid ${meta.color}`,
          borderRadius: 4,
          boxShadow: `0 0 0 4px var(--obsidian), 0 0 0 5px ${meta.color}`,
        }}
        aria-hidden
      />
      <span className="eyebrow" style={{ color: meta.color }}>
        Verdict · Optimistic Democracy
      </span>
      <span
        className="display"
        style={{ fontSize: 'clamp(1.6rem, 4vw, 2.6rem)', color: meta.color, marginTop: '0.3rem' }}
      >
        {meta.word}
      </span>
    </div>
  );
}
