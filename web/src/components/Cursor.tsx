'use client';

import { useEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/motion';

export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const dotEl = dot.current!;
    const ringEl = ring.current!;
    const xDot = gsap.quickTo(dotEl, 'x', { duration: 0.12, ease: 'power3' });
    const yDot = gsap.quickTo(dotEl, 'y', { duration: 0.12, ease: 'power3' });
    const xRing = gsap.quickTo(ringEl, 'x', { duration: 0.4, ease: 'power3' });
    const yRing = gsap.quickTo(ringEl, 'y', { duration: 0.4, ease: 'power3' });

    const move = (e: MouseEvent) => {
      xDot(e.clientX);
      yDot(e.clientY);
      xRing(e.clientX);
      yRing(e.clientY);
    };

    const enter = () => gsap.to(ringEl, { scale: 1.7, borderColor: 'var(--brass)', duration: 0.3 });
    const leave = () => gsap.to(ringEl, { scale: 1, borderColor: 'var(--bone)', duration: 0.3 });

    window.addEventListener('mousemove', move);
    const targets = document.querySelectorAll('a, button, [data-magnetic]');
    targets.forEach((t) => {
      t.addEventListener('mouseenter', enter);
      t.addEventListener('mouseleave', leave);
    });

    return () => {
      window.removeEventListener('mousemove', move);
      targets.forEach((t) => {
        t.removeEventListener('mouseenter', enter);
        t.removeEventListener('mouseleave', leave);
      });
    };
  }, []);

  return (
    <>
      <div ref={dot} className="cursor-dot" aria-hidden />
      <div ref={ring} className="cursor-ring" aria-hidden />
    </>
  );
}
