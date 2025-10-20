'use client';
import { useEffect, useRef, useState } from 'react';
import { useInactivityTimer } from '@/hooks/useInactivityTmer';
import { ensureGsap } from "@/utils/gsapClient";

const SLIDES = [
  '/images/home/XIT_Building_Kiosk_Screensavers-01.jpg',
  '/images/home/XIT_Building_Kiosk_Screensavers-02.jpg',
  '/images/home/XIT_Building_Kiosk_Screensavers-03.jpg',
];

const HOLD_MS = 20000;
const FADE_MS = 1200;
const PERIOD_MS = Math.max(1000, HOLD_MS - FADE_MS);

export default function ScreenSaver() {
  const { idle, reset } = useInactivityTimer(3 * 60 * 1000);
  const gsap = ensureGsap();

  const rootRef  = useRef<HTMLButtonElement | null>(null);
  const frontRef = useRef<HTMLImageElement | null>(null);
  const backRef  = useRef<HTMLImageElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const tlRef    = useRef<gsap.core.Timeline | null>(null);

  const [index, setIndex] = useState(0);

  const preload = (src: string) =>
    new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = src;
    });

  useEffect(() => {
    if (!idle) {
      if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
      if (tlRef.current) { tlRef.current.kill(); tlRef.current = null; }
      return;
    }

    let mounted = true;

    const front = frontRef.current!;
    const back  = backRef.current!;

    const init = async () => {
      if (!mounted) return;

      const cur = index % SLIDES.length;
      const nxt = (index + 1) % SLIDES.length;

      front.src = SLIDES[cur];
      back.src  = SLIDES[nxt];

      await Promise.all([preload(SLIDES[cur]), preload(SLIDES[nxt])]);
      if (!mounted) return;

      gsap.set(front, { opacity: 1 });
      gsap.set(back,  { opacity: 0 });

      if (timerRef.current) { window.clearInterval(timerRef.current); }
      timerRef.current = window.setInterval(async () => {
        if (!mounted) return;
        const nextIndex = (prevIndexRef.current + 1) % SLIDES.length;
        const nextFront = nextIndex;
        const nextBack  = (nextIndex + 1) % SLIDES.length;

        back.src = SLIDES[nextFront];
        try {
          await preload(SLIDES[nextFront]);
        } catch {
        }
        if (!mounted) return;

        if (tlRef.current) tlRef.current.kill();
        tlRef.current = gsap.timeline();
        tlRef.current
          .to(front, { opacity: 0, duration: FADE_MS / 1000, ease: 'power2.out' }, 0)
          .to(back,  { opacity: 1, duration: FADE_MS / 1000, ease: 'power2.out' }, 0)
          .add(() => {
            front.src = back.src;
            gsap.set(front, { opacity: 1 });
            gsap.set(back,  { opacity: 0 });

            const following = SLIDES[nextBack];
            back.src = following;
            preload(following).catch(() => {});
            prevIndexRef.current = nextIndex;
            setIndex(nextIndex);
          });
      }, PERIOD_MS) as unknown as number;
    };

    const prevIndexRef = { current: index };
    init();

    return () => {
      mounted = false;
      if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
      if (tlRef.current) { tlRef.current.kill(); tlRef.current = null; }
    };
  }, [idle, gsap]);

  const onDismiss = () => {
    const el = rootRef.current;
    if (!el) return reset();
    gsap.to(el, { opacity: 0, duration: 0.25, onComplete: reset });
  };

  if (!idle) return null;

  return (
    <button
      ref={rootRef}
      onClick={onDismiss}
      aria-label="Dismiss screensaver"
      className="fixed inset-0 z-[9999] bg-black"
    >
      <img
        ref={frontRef}
        alt=""
        className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none will-change-[opacity]"
        draggable={false}
      />
      <img
        ref={backRef}
        alt=""
        className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none will-change-[opacity]"
        draggable={false}
      />

      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(80% 80% at 50% 50%, transparent, rgba(0,0,0,.15))' }} />
    </button>
  );
}
