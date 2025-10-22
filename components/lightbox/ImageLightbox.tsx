'use client';
import { useEffect, useRef, useState } from 'react';
import LightboxShell from './LightboxShell';

export default function ImageLightbox({
  src,
  caption,
  onClose,
}: {
  src: string;
  caption?: string;
  onClose: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const capRef  = useRef<HTMLDivElement | null>(null);

  const FIG_VPAD = 40;
  const GAP      = 12;

  const [availH, setAvailH] = useState(0);
  const [capH,   setCapH]   = useState(caption ? 96 : 0);

  const measure = () => {
    if (wrapRef.current) setAvailH(wrapRef.current.clientHeight || 0);
    if (capRef.current)  setCapH((capRef.current.offsetHeight || 0) + (caption ? GAP : 0));
  };

  useEffect(() => {
    const t = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(t);
  }, [src, caption]);

  useEffect(() => {
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    if (capRef.current)  ro.observe(capRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const imgBoxH = Math.max(0, availH - (caption ? capH : 0) - FIG_VPAD);

  return (
    <LightboxShell onClose={onClose}>
      <div className="flex-1 min-h-0 text-white flex items-center justify-center px-6 my-6">
        <div ref={wrapRef} className="h-full w-full max-w-[min(1100px,calc(100vw-10rem))]">
          <figure className="h-full max-h-full p-5 flex flex-col">
            <div
              className="w-full flex items-center justify-center"
              style={{ height: `${imgBoxH}px`, overflow: 'hidden' }}
            >
              <img
                src={src}
                alt=""
                className="block max-w-full max-h-full object-contain"
                onLoad={measure}
                draggable={false}
              />
            </div>

            {caption && (
              <div ref={capRef} className="mt-3 w-full">
                <figcaption className="w-full text-center text-lg font-lexendDeca leading-snug opacity-90">
                  {caption}
                </figcaption>
              </div>
            )}
          </figure>
        </div>
      </div>
    </LightboxShell>
  );
}
