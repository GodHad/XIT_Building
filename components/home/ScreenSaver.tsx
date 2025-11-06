'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useInactivityTimer } from '@/hooks/useInactivityTmer';
import { ensureGsap } from '@/utils/gsapClient';
import { useRouter } from 'next/navigation';

const SLIDES = [
  '/images/home/XIT_Building_Kiosk_Screensavers-01.jpg',
  '/images/home/XIT_Building_Kiosk_Screensavers-02.jpg',
  '/images/home/XIT_Building_Kiosk_Screensavers-03.jpg',
];

const HOLD_MS = 20000;
const FADE_MS = 1200;
const PERIOD_MS = Math.max(1000, HOLD_MS - FADE_MS);

export default function ScreenSaver() {
  const { idle } = useInactivityTimer(3 * 60 * 1000);
  const gsap = ensureGsap();
  const router = useRouter();

  const rootRef  = useRef<HTMLButtonElement | null>(null);
  const frontRef = useRef<HTMLImageElement | null>(null);
  const backRef  = useRef<HTMLImageElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const tlRef    = useRef<gsap.core.Timeline | null>(null);

  const [animatingOut, setAnimatingOut] = useState(false);
  const [index, setIndex] = useState(0);
  const navigatingRef = useRef(false);

  useEffect(() => { try { router.prefetch('/'); } catch {} }, [router]);

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
      if (tlRef.current)    { tlRef.current.kill(); tlRef.current = null; }
      return;
    }

    let mounted = true;
    const front = frontRef.current!;
    const back  = backRef.current!;

    (async () => {
      const cur = index % SLIDES.length;
      const nxt = (index + 1) % SLIDES.length;

      front.src = SLIDES[cur];
      back.src  = SLIDES[nxt];

      await Promise.all([preload(SLIDES[cur]), preload(SLIDES[nxt])]);
      if (!mounted) return;

      gsap.set(front, { opacity: 1 });
      gsap.set(back,  { opacity: 0 });

      if (timerRef.current) window.clearInterval(timerRef.current);
      const prevIndexRef = { current: index };

      timerRef.current = window.setInterval(async () => {
        if (!mounted) return;
        const nextIndex = (prevIndexRef.current + 1) % SLIDES.length;
        const nextFront = nextIndex;
        const nextBack  = (nextIndex + 1) % SLIDES.length;

        back.src = SLIDES[nextFront];
        try { await preload(SLIDES[nextFront]); } catch {}

        if (tlRef.current) tlRef.current.kill();
        tlRef.current = gsap.timeline()
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
    })();

    return () => {
      mounted = false;
      if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
      if (tlRef.current)    { tlRef.current.kill(); tlRef.current = null; }
    };
  }, [idle, gsap, index]);

  const getXY = (e: any) => {
    if (e?.touches?.[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (e?.changedTouches?.[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    if (typeof e?.clientX === 'number' && typeof e?.clientY === 'number') return { x: e.clientX, y: e.clientY };
    return null;
  };

  const forwardTapToUnderlying = (e: any) => {
    const coords = getXY(e);
    if (!coords) return;
    const { x, y } = coords;

    const overlay = rootRef.current;
    if (overlay) overlay.style.pointerEvents = 'none';

    const target = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!target) return;

    const opts: any = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'touch' };
    try { target.dispatchEvent(new PointerEvent('pointerdown', opts)); } catch {}
    try { target.dispatchEvent(new PointerEvent('pointerup',   opts)); } catch {}
    try { target.dispatchEvent(new MouseEvent('click',        opts)); } catch {}
  };

  const onDismiss = useCallback((e?: any) => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;

    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    if (tlRef.current)    { tlRef.current.kill(); tlRef.current = null; }

    setAnimatingOut(true);

    const isHome = typeof window !== 'undefined' && window.location.pathname === '/';

    if (isHome) {
      const el = rootRef.current;
      if (el) {
        gsap.to(el, {
          opacity: 0,
          duration: 0.2,
          ease: 'power1.out',
          onComplete: () => setAnimatingOut(false),
        });
      } else {
        setAnimatingOut(false);
      }
      try { e?.preventDefault?.(); e?.stopPropagation?.(); } catch {}
      setTimeout(() => forwardTapToUnderlying(e), 0);

      navigatingRef.current = false;
      return;
    }

    try { router.push('/'); } catch {}
    window.setTimeout(() => {
      if (window.location.pathname !== '/') window.location.assign('/');
    }, 800);

    const el = rootRef.current;
    if (el) {
      gsap.to(el, { opacity: 0, duration: 0.25, ease: 'power1.out' });
    }
  }, [gsap, router]);

  if (!idle && !animatingOut) return null;

  return (
    <button
      ref={rootRef}
      type="button"
      className="fixed inset-0 bg-black z-[2147483647]"
      onPointerDownCapture={onDismiss}
      onTouchStartCapture={onDismiss}
      onMouseDownCapture={onDismiss}
      style={{
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      aria-label="Dismiss screensaver"
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
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(80% 80% at 50% 50%, transparent, rgba(0,0,0,.15))' }}
      />
    </button>
  );
}
