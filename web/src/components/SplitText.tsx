'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, registerGsap, prefersReducedMotion } from '@/lib/motion';

interface SplitTextProps {
  text: string;
  className?: string;
  start?: string;
  stagger?: number;
}

// Hand-rolled split-text mask reveal (no paid plugin). Each word rides up from
// behind a clipping mask, staggered.
export default function SplitText({ text, className = '', start = 'top 85%', stagger = 0.05 }: SplitTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const words = text.split(' ');

  useEffect(() => {
    registerGsap();
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const inners = el.querySelectorAll<HTMLElement>('.line-inner');
    gsap.set(inners, { yPercent: 115 });
    const tween = gsap.to(inners, {
      yPercent: 0,
      duration: 1,
      ease: 'power4.out',
      stagger,
      scrollTrigger: { trigger: el, start },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [start, stagger]);

  return (
    <span ref={ref} className={className} style={{ display: 'inline' }}>
      {words.map((w, i) => (
        <span key={i} className="line-mask" style={{ display: 'inline-block' }}>
          <span className="line-inner" style={{ display: 'inline-block' }}>
            {w}
            {i < words.length - 1 ? '\u00A0' : ''}
          </span>
        </span>
      ))}
    </span>
  );
}
