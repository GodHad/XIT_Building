'use client';
import { useEffect, useRef, useState } from 'react';

export function useInactivityTimer(timeoutMs = 180000) {
  const [idle, setIdle] = useState(false);
  const timerRef = useRef<number | null>(null);

  const start = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setIdle(true), timeoutMs);
  };

  const reset = () => {
    setIdle(false);
    start();
  };

  useEffect(() => {
    start();
    const ping = () => reset();
    const events: (keyof WindowEventMap)[] = ['pointerdown','mousemove','keydown','wheel','touchstart'];
    events.forEach(e => window.addEventListener(e, ping, { passive: true }));
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      events.forEach(e => window.removeEventListener(e, ping));
    };
  }, [timeoutMs]);

  return { idle, reset };
}
