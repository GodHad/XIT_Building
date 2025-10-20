'use client';
import { useEffect, useRef, useState, useCallback } from "react";
import { ensureGsap, Draggable } from "@/utils/gsapClient";
import MapPin from "./MapPin";
import EdgeArrows from "./EdgeArrows";  
import { useSoundEffect } from "@/hooks/useSoundEffect";
import { Pin } from "@/data/types";
import { tracks } from '@/data/buildings';

type Props = {
  mapSrc: string;
  pins: Pin[];
  selectedId?: string;
  onSelectPin?: (id: string) => void;
  onExplore?: (id: string) => void;

  fitMode?: 'contain' | 'width';
  showControls?: boolean;
  initialScaleMul?: number;
  minScaleMul?: number;
  showArrows?: boolean;      
  onHome?: () => void;
};

export default function MapCanvas({
  mapSrc, pins, selectedId, onSelectPin, onExplore,
  fitMode='contain', showControls=true, initialScaleMul=1, minScaleMul=0.5,
  showArrows=false, onHome
}: Props) {
  const gsap = ensureGsap();
  const playWhoosh  = useSoundEffect('/sounds/WHOOSH.mp3');
  const playTooltip = useSoundEffect('/sounds/TOOLTIP.mp3');

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef  = useRef<HTMLDivElement | null>(null);
  const imgRef      = useRef<HTMLImageElement | null>(null);

  const tooltipRef  = useRef<HTMLDivElement | null>(null);
  const [tooltipFor, setTooltipFor] = useState<string | null>(null);

  const [nat, setNat] = useState({ w: 0, h: 0 });
  const baseScaleRef  = useRef(1);
  const firstFitDone  = useRef(false);
  const droppedOnce   = useRef(false);
  const prevSelected  = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (contentRef.current) gsap.set(contentRef.current, { transformOrigin: '0 0' });
    const el = contentRef.current; if (!el) return;
    const d = Draggable.create(el, {
      type: 'x,y',
      bounds: undefined,
      cursor: 'grab',
      activeCursor: 'grabbing',
      zIndexBoost: false,
      onDrag: () => setTooltipFor(null),
    });
    return () => d.forEach(x => x.kill());
  }, [gsap]);

  useEffect(() => {
    const img = imgRef.current; if (!img) return;
    const onLoad = () => setNat({ w: img.naturalWidth, h: img.naturalHeight });
    if (img.complete && img.naturalWidth) onLoad();
    else img.addEventListener('load', onLoad);
    return () => img.removeEventListener('load', onLoad);
  }, []);

  const fitAndCenter = useCallback((animate = false) => {
    if (!viewportRef.current || !contentRef.current || !nat.w || !nat.h) return;
    const vw = viewportRef.current.clientWidth;
    const vh = viewportRef.current.clientHeight;
    const fit = fitMode === 'width' ? vw / nat.w : Math.min(vw / nat.w, vh / nat.h);
    const firstBump = !firstFitDone.current ? initialScaleMul : 1;
    const s = fit * firstBump;
    const x = (vw - nat.w * s) / 2;
    const y = (vh - nat.h * s) / 2;
    baseScaleRef.current = fit;
    firstFitDone.current = true;
    gsap.to(contentRef.current, {
      x, y, scale: s, ease: 'power2.out',
      duration: animate ? 0.35 : 0,
      onUpdate: updateTooltipScale,
    });
  }, [gsap, fitMode, nat.w, nat.h]);

  useEffect(() => { fitAndCenter(false); }, [fitAndCenter]);
  
  const updateTooltipScale = useCallback(() => {
    if (!tooltipRef.current || !contentRef.current) return;
    const s = (gsap.getProperty(contentRef.current, 'scale') as number) || 1;
    tooltipRef.current.style.setProperty('--inv', String(1 / s));
  }, [gsap]);

  const centerOn = useCallback((nx: number, ny: number, duration = 0.8) => {
    if (!viewportRef.current || !contentRef.current || !nat.w || !nat.h) return;
    const vw = viewportRef.current.clientWidth;
    const vh = viewportRef.current.clientHeight;
    const s  = (gsap.getProperty(contentRef.current, 'scale') as number) || 1;
    const x  = vw / 2 - nx * nat.w * s;
    const y  = vh / 2 - ny * nat.h * s;
    gsap.to(contentRef.current, {
      x, y, duration, ease: 'power2.inOut',
      onUpdate: updateTooltipScale,
    });
  }, [gsap, nat.w, nat.h]);

  const centerOnIds = useCallback((ids: string[], duration = 0.8) => {
    const set = new Set(ids.map(s => s.trim()).filter(Boolean));
    const pts = pins.filter(p => set.has(p.id));
    if (!pts.length) return;

    const avgX = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    const avgY = pts.reduce((a, p) => a + p.y, 0) / pts.length;

    playWhoosh();
    centerOn(avgX, avgY, duration);
  }, [pins, centerOn, playWhoosh]);

  useEffect(() => {
    if (!selectedId) return;

    if (selectedId.includes(',')) {
      centerOnIds(selectedId.split(','));
      return;
    }

    const prev = prevSelected.current;
    prevSelected.current = selectedId;

    const currEl = contentRef.current?.querySelector(`[data-pin-id="${selectedId}"] img`) as HTMLElement | null;
    const prevEl = prev ? (contentRef.current?.querySelector(`[data-pin-id="${prev}"] img`) as HTMLElement | null) : null;

    if (prevEl) gsap.to(prevEl, { scale: 0.9, duration: 0.18, ease: 'power2.out' });
    if (currEl) gsap.to(currEl, { scale: 1.28, duration: 0.18, ease: 'power2.out' });

    const p = pins.find(p => p.id === selectedId);
    if (p) { playWhoosh(); centerOn(p.x, p.y, 0.75); }
  }, [selectedId, pins, centerOn, gsap, playWhoosh]);

  const zoomBy = (factor: number) => {
    const el = contentRef.current, wrap = viewportRef.current;
    if (!el || !wrap) return;
    const cur = (gsap.getProperty(el, 'scale') as number) || 1;
    const min = baseScaleRef.current * (minScaleMul ?? 0.5);
    const next = Math.min(Math.max(cur * factor, min), 2.5);
    const vw = wrap.clientWidth, vh = wrap.clientHeight;
    const cx = vw / 2, cy = vh / 2;
    const tx = (gsap.getProperty(el, 'x') as number) || 0;
    const ty = (gsap.getProperty(el, 'y') as number) || 0;
    const nx = cx - (cx - tx) * (next / cur);
    const ny = cy - (cy - ty) * (next / cur);
    gsap.to(el, {
      scale: next, x: nx, y: ny, duration: 0.25, ease: 'power2.out',
      onUpdate: updateTooltipScale,
    });
  };

  useEffect(() => {
    if (!tooltipRef.current) return;
    updateTooltipScale();

    const card = tooltipRef.current.querySelector('.tooltip-card') as HTMLElement | null;
    if (!card) return;

    card.style.opacity = '1';
    gsap.fromTo(
      card,
      { scaleX: 0, transformOrigin: '0 50%' },
      { scaleX: 1, duration: 0.22, ease: 'power2.out' }
    );
  }, [tooltipFor, updateTooltipScale, gsap]);
  
  const multiSelect = !!selectedId && selectedId.includes(',');

  return (
    <div ref={viewportRef} className="relative w-full h-full overflow-hidden">
      <div ref={contentRef} className="absolute top-0 left-0 will-change-transform">
        <div className="relative" style={{ width: nat.w || undefined, height: nat.h || undefined }}>
          <img
            ref={imgRef}
            src={mapSrc}
            alt="Map"
            draggable={false}
            className="block select-none pointer-events-none w-full h-auto"
          />

          {nat.w > 0 && pins.map(p => (
            <MapPin
              key={p.id}
              id={p.id}
              x={p.x * nat.w}
              y={p.y * nat.h}
              selected={!multiSelect && p.id === selectedId}
              label={p.label}
              onClick={() => {
                onSelectPin?.(p.id);
                setTooltipFor(p.id);
                playTooltip();
              }}
            />
          ))}

          {tooltipFor && (() => {
            const pin = pins.find(p => p.id === tooltipFor);
            if (!pin) return null;

            const buildingId = String(pin.id ?? tooltipFor).split(':')[0];
            const buildingName =
              tracks.find(t => t.id === buildingId)?.name ?? pin.label ?? 'Location';

            const pinImg = contentRef.current?.querySelector(
              `[data-pin-id="${tooltipFor}"] img`
            ) as HTMLElement | null;

            const s = (gsap.getProperty(contentRef.current!, 'scale') as number) || 1;
            const pinRect = pinImg?.getBoundingClientRect();
            const pinHContent = pinRect ? (pinRect.height / s) : 36;
            const pinHalf = pinHContent * 0.5;

            const leftPx = pin.x * nat.w;
            const topPx  = pin.y * nat.h - pinHalf;

            return (
              <div
                ref={tooltipRef}
                className="absolute z-10"
                style={{
                  left: leftPx,
                  top:  topPx,
                  transform: 'translateY(-50%) scale(var(--inv, 1))',
                  transformOrigin: '0 50%',
                  pointerEvents: 'auto',
                }}
              >
                <div
                  className="tooltip-card bg-black text-white rounded-sm shadow border border-black/10 px-4 py-2"
                  style={{
                    minWidth: 420,
                    maxWidth: 720,
                    fontSize: 16,
                    lineHeight: 1.25,
                    paddingLeft: 48,
                    willChange: 'transform',
                  }}
                >
                  <div className="flex items-center gap-6">
                    <span className="text-2xl font-semibold whitespace-nowrap flex-1 min-w-0 truncate">
                      {buildingName}
                    </span>
                    <button
                      onClick={() => onExplore?.(tooltipFor)}
                      className="cursor-pointer shrink-0 leading-none"
                      aria-label="Explore building"
                    >
                      Click to explore building
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      </div>

      {showArrows && nat.w > 0 && (
        <EdgeArrows
          containerRef={viewportRef}
          contentRef={contentRef}
          pins={pins}
          natSize={nat}
          arrowSrc="/images/home/MapArrows.png"
        />
      )}

      {showControls && (
        <div className="absolute bottom-5 left-5 z-[200] flex flex-col items-start gap-2">
          <button onClick={() => zoomBy(1/1.2)} className="cursor-pointer mx-auto" aria-label="Zoom out">
            <img src="/images/home/MinusButton.png" className="h-14 w-14" alt="" />
          </button>
          <button onClick={() => zoomBy(1.2)} className="cursor-pointer mx-auto" aria-label="Zoom in">
            <img src="/images/home/PlusButton.png" className="h-14 w-14" alt="" />
          </button>
          <button onClick={onHome} className="cursor-pointer mt-1" aria-label="Home">
            <img src="/images/home/home-button.png" className="h-10 w-auto" alt="Home" />
          </button>
        </div>
      )}
    </div>
  );
}
