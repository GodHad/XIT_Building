'use client';
import { useEffect } from 'react';
import ScreenFander from '@/components/chrome/ScreenFander';

export default function Template({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const el = document.getElementById('screen-fader');
    if (!el) return;
    el.style.transition = 'opacity .25s linear';
    el.style.opacity = '0';
  }, []);

  return (
    <>
      <ScreenFander />
      {children}
    </>
  );
}
