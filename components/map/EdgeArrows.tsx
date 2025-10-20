'use client';
import { RefObject, useEffect, useMemo, useRef } from 'react';
import { ensureGsap } from '@/utils/gsapClient';
import type { Pin } from '@/data/types';

type Props = {
  containerRef: RefObject<HTMLDivElement | null>;
  contentRef:   RefObject<HTMLDivElement | null>;
  pins: Pin[];
  natSize: { w: number; h: number };
  arrowSrc?: string;
  edgeInsetPx?: number;
  insideMarginPx?: number;
  minSepDeg?: number;
  stickDeg?: number;
  maxArrows?: number;
  baseAngleDeg?: number;
};

export default function EdgeArrows({
  containerRef,
  contentRef,
  pins,
  natSize,
  arrowSrc       = '/images/home/MapArrows.png',
  edgeInsetPx    = 44,
  insideMarginPx = 12,
  minSepDeg      = 45,
  stickDeg       = 12,
  maxArrows      = 6,
  baseAngleDeg   = -90,
}: Props) {
  const gsap = ensureGsap();

  const ids  = useMemo(() => Array.from({ length: maxArrows }, (_, i) => i), [maxArrows]);
  const refs = useRef<(HTMLImageElement | null)[]>([]);

  const slotAngle = useRef<(number | null)[]>(Array.from({ length: maxArrows }, () => null));
  const slotRot   = useRef<(number | null)[]>(Array.from({ length: maxArrows }, () => null));
  const lastTick  = useRef(0);

  useEffect(() => {
    if (slotAngle.current.length !== maxArrows) {
      slotAngle.current = Array.from({ length: maxArrows }, () => null);
      slotRot.current   = Array.from({ length: maxArrows }, () => null);
    }
  }, [maxArrows]);

  useEffect(() => {
    const TWO_PI = Math.PI * 2;
    const toNorm = (a:number) => {
      let x = a % TWO_PI;
      if (x < 0) x += TWO_PI;
      return x;
    };
    const angDiff = (a:number, b:number) => {
      const d = Math.abs(a - b) % TWO_PI;
      return d > Math.PI ? TWO_PI - d : d;
    };

    const minSep = (minSepDeg * Math.PI) / 180;
    const stick  = (stickDeg  * Math.PI) / 180;

    const tick = () => {
      const now = performance.now();
      if (now - lastTick.current < 1000/30) return;
      lastTick.current = now;

      const view = containerRef.current, content = contentRef.current;
      if (!view || !content || !natSize.w || !natSize.h) return;

      const vw = view.clientWidth, vh = view.clientHeight;
      const tx = (gsap.getProperty(content, 'x') as number) || 0;
      const ty = (gsap.getProperty(content, 'y') as number) || 0;
      const s  = (gsap.getProperty(content, 'scale') as number) || 1;

      const margin = (insideMarginPx || 0) / s;
      const left   = -tx / s + margin;
      const top    = -ty / s + margin;
      const right  = left + (vw / s) - margin * 2;
      const bottom = top  + (vh / s) - margin * 2;
      const inView = (px:number, py:number) => (px >= left && px <= right && py >= top && py <= bottom);

      const cxV = vw / 2, cyV = vh / 2;

      type Cand = { angN:number; dist:number; x:number; y:number; rotDeg:number };
      const raw: Cand[] = [];

      for (const p of pins) {
        const px = p.x * natSize.w, py = p.y * natSize.h;
        if (inView(px, py)) continue;

        const pxV = tx + px * s, pyV = ty + py * s;
        const dx  = pxV - cxV,    dy  = pyV - cyV;
        const dist = Math.hypot(dx, dy);
        const ang  = Math.atan2(dy, dx);
        const angN = toNorm(ang);

        const m = edgeInsetPx, EPS = 1e-6;
        const tR = dx >  EPS ? (vw - m - cxV) / dx : Infinity;
        const tL = dx < -EPS ? (m  - cxV) / dx : Infinity;
        const tD = dy >  EPS ? (vh - m - cyV) / dy : Infinity;
        const tU = dy < -EPS ? (m  - cyV) / dy : Infinity;
        const t  = Math.min(tR, tL, tD, tU, 1e9);

        const x = cxV + dx * t;
        const y = cyV + dy * t;

        raw.push({ angN, dist, x, y, rotDeg: (ang * 180)/Math.PI + baseAngleDeg });
      }

      raw.sort((a,b) => a.dist - b.dist);
      const picked: Cand[] = [];
      for (const c of raw) {
        if (picked.length >= maxArrows) break;
        if (picked.every(p => angDiff(p.angN, c.angN) >= minSep)) picked.push(c);
      }

      const used = new Array(picked.length).fill(false);

      for (let i = 0; i < ids.length; i++) {
        const el = refs.current[i];
        const prevAng = slotAngle.current[i];
        if (!el || prevAng == null) continue;

        let bestJ = -1, bestD = Infinity;
        for (let j = 0; j < picked.length; j++) {
          if (used[j]) continue;
          const d = angDiff(prevAng, picked[j].angN);
          if (d < bestD) { bestD = d; bestJ = j; }
        }

        if (bestJ !== -1 && bestD <= stick) {
          const c = picked[bestJ];
          used[bestJ] = true;

          gsap.to(el, { x: c.x, y: c.y, autoAlpha: 1, duration: 0.18, ease: 'power2.out' });

          slotAngle.current[i] = c.angN;
        } else {
          gsap.to(el, { autoAlpha: 0, duration: 0.15, ease: 'power2.out' });
          slotAngle.current[i] = null;
          slotRot.current[i]   = null;
        }
      }

      for (let j = 0; j < picked.length; j++) {
        if (used[j]) continue;
        const freeI = slotAngle.current.findIndex(a => a == null);
        if (freeI === -1) break;

        const el = refs.current[freeI]; if (!el) continue;
        const c  = picked[j];

        gsap.set(el, { x: c.x, y: c.y, rotation: c.rotDeg, autoAlpha: 0 });
        gsap.to(el,   { autoAlpha: 1, duration: 0.18, ease: 'power2.out' });

        slotAngle.current[freeI] = c.angN;
        slotRot.current[freeI]   = c.rotDeg;
      }
    };

    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [
    containerRef, contentRef, pins,
    natSize.w, natSize.h,
    edgeInsetPx, insideMarginPx,
    minSepDeg, stickDeg,
    maxArrows, baseAngleDeg,
    gsap, ids.length
  ]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[900]">
      {ids.map(i => (
        <img
          key={i}
          ref={el => {refs.current[i] = el}}
          src={arrowSrc}
          alt=""
          className="absolute h-10 w-10 select-none opacity-0"
          style={{ left: 0, top: 0, transform: 'translate(-50%, -50%)' }}
        />
      ))}
    </div>
  );
}
