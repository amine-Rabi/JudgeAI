'use client';

import { useRef } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/motion';

// Magnetic pull for the primary CTA (desktop / fine-pointer only).
export default function Magnetic({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);

  const onMove = (e: React.MouseEvent) => {
    if (prefersReducedMotion()) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    gsap.to(el, { x: x * 0.35, y: y * 0.45, duration: 0.5, ease: 'power3.out' });
  };

  const reset = () => {
    const el = ref.current;
    if (el) gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
  };

  return (
    <span
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ display: 'inline-block' }}
    >
      {children}
    </span>
  );
}
