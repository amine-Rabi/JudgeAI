'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/motion';

interface BalanceProps {
  faultA: number; // 0..100 (50 = level). higher => Party A's pan sinks.
  live?: boolean; // true while consensus is pending: the beam wavers, unsettled
  resolved?: boolean;
  size?: number;
}

const PIVOT_X = 200;
const PIVOT_Y = 122;
const ARM = 134;
const CHAIN = 52;
const MAX_DEG = 13;

function ends(deg: number) {
  const r = (deg * Math.PI) / 180;
  return {
    lx: PIVOT_X - ARM * Math.cos(r),
    ly: PIVOT_Y + ARM * Math.sin(r),
    rx: PIVOT_X + ARM * Math.cos(r),
    ry: PIVOT_Y - ARM * Math.sin(r),
  };
}

export default function Balance({ faultA, live = false, resolved = false, size = 420 }: BalanceProps) {
  const target = ((Math.max(0, Math.min(100, faultA)) - 50) / 50) * MAX_DEG;
  const [deg, setDeg] = useState(resolved ? target : 0);
  const obj = useRef({ d: resolved ? target : 0 });

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDeg(target);
      return;
    }
    const update = () => setDeg(obj.current.d);

    if (live) {
      // unsettled: oscillate around 0 — validators still deliberating
      const t = gsap.to(obj.current, {
        d: 6,
        duration: 1.1,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        onUpdate: update,
      });
      return () => {
        t.kill();
      };
    }

    // Settle toward the verdict with an elastic overshoot, then keep gently
    // seeking balance — a real scale never sits perfectly still.
    const SWAY = 2.4;
    const tl = gsap.timeline();
    tl.to(obj.current, {
      d: target,
      duration: 1.6,
      ease: 'elastic.out(1, 0.55)',
      onUpdate: update,
    });
    tl.to(obj.current, {
      d: target - SWAY,
      duration: 1.3,
      ease: 'sine.inOut',
      onUpdate: update,
    });
    tl.to(obj.current, {
      d: target + SWAY,
      duration: 2.6,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      onUpdate: update,
    });
    return () => {
      tl.kill();
    };
  }, [target, live]);

  const e = ends(deg);
  const stroke = 'var(--brass)';
  const aColor = 'var(--verdigris)';
  const bColor = 'var(--ember)';

  return (
    <svg
      viewBox="0 0 400 360"
      width={size}
      height={size}
      role="img"
      aria-label={`Balance of judgment. Fault assigned to Party A: ${Math.round(faultA)} percent.`}
      style={{ maxWidth: '100%', overflow: 'visible' }}
    >
      {/* tolerance band — the zone of agreement at center */}
      <rect x={PIVOT_X - 26} y={36} width={52} height={250} fill="rgba(255,91,46,0.06)" />
      <line x1={PIVOT_X} y1={30} x2={PIVOT_X} y2={300} stroke="var(--line)" strokeDasharray="2 6" />

      {/* stand */}
      <line x1={PIVOT_X} y1={PIVOT_Y} x2={PIVOT_X} y2={312} stroke={stroke} strokeWidth={3} />
      <path d={`M ${PIVOT_X - 46} 322 L ${PIVOT_X + 46} 322 L ${PIVOT_X + 30} 312 L ${PIVOT_X - 30} 312 Z`} fill={stroke} opacity={0.85} />

      {/* beam */}
      <line x1={e.lx} y1={e.ly} x2={e.rx} y2={e.ry} stroke={stroke} strokeWidth={4} strokeLinecap="round" />
      <circle cx={PIVOT_X} cy={PIVOT_Y} r={7} fill={stroke} />

      {/* left pan (Party A) */}
      <g>
        <line x1={e.lx} y1={e.ly} x2={e.lx} y2={e.ly + CHAIN} stroke="var(--slate)" strokeWidth={1.5} />
        <path
          d={`M ${e.lx - 40} ${e.ly + CHAIN} a 40 40 0 0 0 80 0`}
          fill="rgba(95,179,155,0.10)"
          stroke={aColor}
          strokeWidth={2}
        />
        <text x={e.lx} y={e.ly + CHAIN + 34} textAnchor="middle" fill={aColor} fontFamily="var(--font-mono)" fontSize={11} letterSpacing={2}>
          A
        </text>
      </g>

      {/* right pan (Party B) */}
      <g>
        <line x1={e.rx} y1={e.ry} x2={e.rx} y2={e.ry + CHAIN} stroke="var(--slate)" strokeWidth={1.5} />
        <path
          d={`M ${e.rx - 40} ${e.ry + CHAIN} a 40 40 0 0 0 80 0`}
          fill="rgba(224,74,61,0.10)"
          stroke={bColor}
          strokeWidth={2}
        />
        <text x={e.rx} y={e.ry + CHAIN + 34} textAnchor="middle" fill={bColor} fontFamily="var(--font-mono)" fontSize={11} letterSpacing={2}>
          B
        </text>
      </g>
    </svg>
  );
}
