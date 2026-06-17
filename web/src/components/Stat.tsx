'use client';

import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

interface StatProps {
  to: number;
  label: string;
  prefix?: string;
  suffix?: string;
}

// A figure that counts up the first time it scrolls into view. The numbers are
// real properties of the contract, not vanity metrics.
export default function Stat({ to, label, prefix = '', suffix = '' }: StatProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(prefersReducedMotion() ? to : 0);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    let started = false;
    const run = () => {
      if (started) return;
      started = true;
      const start = performance.now();
      const dur = 1500;
      const step = (t: number) => {
        const p = Math.min((t - start) / dur, 1);
        setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && run()),
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to]);

  return (
    <div ref={ref}>
      <div className="stat-num">
        {prefix}
        {n}
        {suffix}
      </div>
      <span className="mono" style={{ display: 'block', marginTop: '0.8rem' }}>
        {label}
      </span>
    </div>
  );
}
