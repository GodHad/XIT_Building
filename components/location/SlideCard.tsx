'use client';
import { Slide } from '@/data/types';
import { memo, useEffect, useRef, useState } from 'react';

function SlideCard({ slide, onOpen }: { slide: Slide; onOpen: (s: Slide) => void }) {
  const isPdf = slide.mediaType === 'flipbook';

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const imgRef  = useRef<HTMLImageElement | null>(null);
  const capRef  = useRef<HTMLDivElement | null>(null);

  const GAP = 24;

  const [imgWidth, setImgWidth] = useState<number | undefined>(undefined);
  const [reservedCap, setReservedCap] = useState<number>(slide.caption ? 96 : 0);
  const [availH, setAvailH] = useState(0);

  const measure = () => {
    if (wrapRef.current) setAvailH(wrapRef.current.clientHeight || 0);
    if (capRef.current) {
      const h = capRef.current.offsetHeight || 0;
      setReservedCap(slide.caption ? h + GAP : 0);
    }
    if (imgRef.current) setImgWidth(imgRef.current.clientWidth || undefined);
  };

  useEffect(() => {
    setReservedCap(slide.caption ? 96 : 0);
    const t = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(t);
  }, [slide.src, slide.caption]);

  useEffect(() => {
    const onR = () => measure();
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  const imgMaxH = Math.max(0, availH - reservedCap);

  return (
    <div ref={wrapRef} className="h-full min-h-0 flex flex-col">
      <button
        type="button"
        onClick={() => onOpen(slide)}
        aria-label="Open media"
        className="shrink-0 flex items-start overflow-hidden bg-transparent cursor-pointer"
      >
        <img
          ref={imgRef}
          src={isPdf ? (slide.thumb ?? slide.src) : (slide.thumb ?? slide.src)}
          alt=""
          className="block h-auto w-auto max-w-full object-contain"
          style={{ maxHeight: `${imgMaxH}px` }}
          onLoad={measure}
          draggable={false}
        />
      </button>

      {slide.caption && (
        <div
          ref={capRef}
          className="px-1 shrink-0"
          style={imgWidth ? { width: imgWidth } : undefined}
        >
          <div style={{ height: GAP }} />
          <p className="text-white text-sm leading-snug">{slide.caption}</p>
        </div>
      )}
    </div>
  );
}

export default memo(SlideCard);
