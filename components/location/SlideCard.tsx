'use client';
import { Slide } from '@/data/types';
import { memo, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen } from '@fortawesome/free-solid-svg-icons';

function SlideCard({ slide, onOpen }: { slide: Slide; onOpen: (s: Slide) => void }) {
  const isPdf = slide.mediaType === 'flipbook';

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const imgRef  = useRef<HTMLImageElement | null>(null);
  const capRef  = useRef<HTMLDivElement | null>(null);

  const GAP = 24;
  const TIP_WIDTH = 90;
  const TIP_TOP_OFFSET = 30;

  const [reservedCap, setReservedCap] = useState<number>(slide.caption ? 96 : 0);
  const [availH, setAvailH] = useState(0);
  const [imgMaxW, setImgMaxW] = useState<number | undefined>(undefined);

  const measure = () => {
    const wrapH = wrapRef.current?.clientHeight ?? 0;
    setAvailH(wrapH);

    if (capRef.current) {
      const h = capRef.current.offsetHeight || 0;
      setReservedCap(slide.caption ? h + GAP : 0);
    }

    const sidebarW = wrapRef.current?.clientWidth ?? 0;
    const maxForImage = Math.max(0, sidebarW - TIP_WIDTH);
    setImgMaxW(maxForImage || undefined);
  };

  useEffect(() => {
    setReservedCap(slide.caption ? 96 : 0);
    const t = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(t);
  }, [slide.src, slide.thumb, slide.caption]);

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
        className="shrink-0 bg-transparent cursor-pointer block text-left"
      >
        <div
          className="relative inline-block align-top"
          style={{ maxWidth: imgMaxW }}
        >
          <img
            ref={imgRef}
            src={slide.thumb ?? slide.src}
            alt=""
            className="block h-auto w-auto max-w-full object-contain"
            style={{ maxHeight: `${imgMaxH}px` }}
            onLoad={measure}
            draggable={false}
          />

          {isPdf && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: '100%',
                top: TIP_TOP_OFFSET,
                width: TIP_WIDTH,
              }}
            >
              <div className="bg-white text-black rounded-tr-lg rounded-br-lg shadow border border-black/10 px-2 py-1.5 flex flex-col items-center gap-1">
                <FontAwesomeIcon icon={faBookOpen} className="h-5 w-5" />
                <span className="text-[14px] leading-tight font-medium text-center">
                  Click to flip through<br/>booklet
                </span>
              </div>
            </div>
          )}
        </div>
      </button>

      {slide.caption && (
        <div ref={capRef} className="px-1 shrink-0 w-full">
          <div style={{ height: GAP }} />
          <p className="text-white text-sm leading-snug w-full">{slide.caption}</p>
        </div>
      )}
    </div>
  );
}

export default memo(SlideCard);
