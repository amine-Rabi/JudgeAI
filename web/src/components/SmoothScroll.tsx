'use client';

import { ReactLenis, useLenis } from 'lenis/react';
import { useEffect } from 'react';
import { registerGsap, ScrollTrigger, prefersReducedMotion } from '@/lib/motion';

function ScrollSync() {
  const lenis = useLenis();
  useEffect(() => {
    registerGsap();
    if (!lenis) return;
    const onScroll = () => ScrollTrigger.update();
    lenis.on('scroll', onScroll);
    return () => {
      lenis.off('scroll', onScroll);
    };
  }, [lenis]);
  return null;
}

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  // Respect reduced-motion: skip the smooth-scroll layer entirely.
  if (prefersReducedMotion()) return <>{children}</>;
  return (
    <ReactLenis root options={{ lerp: 0.09, smoothWheel: true }}>
      <ScrollSync />
      {children}
    </ReactLenis>
  );
}
