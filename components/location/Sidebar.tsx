'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import { ensureGsap } from '@/utils/gsapClient';
import { Slide } from '@/data/types';
import SlideCard from './SlideCard';
import ImageLightbox from '@/components/lightbox/ImageLightbox';
import PdfFlipBook from '@/components/lightbox/PdfFlipBook';
import { useSoundEffect } from '@/hooks/useSoundEffect';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';

export default function Sidebar({
  slides, index, setIndex, onPinChange, buildingName
}: {
  slides: Slide[]; index: number; setIndex: (i: number) => void;
  onPinChange: (pinId?: string | null) => void; buildingName: string;
}) {
  const gsap = ensureGsap();
  const router = useRouter();

  const asideRef = useRef<HTMLDivElement | null>(null);
  const listRef  = useRef<HTMLDivElement | null>(null);

  const flipSfx  = useSoundEffect('/sounds/flip.mp3');
  const clickSfx = useSoundEffect('/sounds/CLICK.mp3');

  useEffect(() => {
    if (!listRef.current) return;
    const items = Array.from(listRef.current.children) as HTMLElement[];
    gsap.fromTo(items, { y: -10, opacity: 0, scale: 0.98 }, { y: 0, opacity: 1, scale: 1, duration: 0.12, stagger: 0.05, ease: 'power2.out' });
  }, [gsap]);

  const preload = (url: string) =>
    new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = img.onerror = () => resolve();
      img.src = url;
      if (img.complete) resolve();
    });

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  const go = async (dir: 1 | -1) => {
    const next = Math.min(Math.max(index + dir, 0), slides.length - 1);
    if (next === index) return;

    const nextSlide = slides[next];
    clickSfx();

    await Promise.race([preload(nextSlide.thumb ?? nextSlide.src), sleep(220)]);
    setIndex(next);
    if (typeof nextSlide.locationPin !== 'undefined') onPinChange(nextSlide.locationPin ?? null);

    const wrap = document.getElementById('active-slide-wrap');
    if (wrap) {
      const yFrom = dir === 1 ? 120 : -120;
      gsap.fromTo(wrap, { y: yFrom, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' });
    }
  };

  const onMenu = () => {
    clickSfx();
    try {
      const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });

      tl.to(asideRef.current, { autoAlpha: 0, y: 6, duration: 0.22 }, 0);

      const logo   = document.querySelector<HTMLImageElement>('img[alt="The Historic Buildings of Dalhart"]');
      const mapBtn = document.querySelector<HTMLButtonElement>('button[aria-label="Open map"]');

      if (logo || mapBtn) tl.to([logo, mapBtn], { autoAlpha: 0, duration: 0.18 }, 0);

      const border = document.querySelector<HTMLDivElement>('div.border-\\[\\#75290E\\]');
      if (border) tl.to(border, { xPercent: 110, duration: 0.28 }, 0.02);

      tl.add(() => router.push('/'));
    } catch {
      router.push('/');
    }
  };

  const [opened, setOpened] = useState<Slide | null>(null);
  const open  = (s: Slide) => { setOpened(s); clickSfx(); };
  const close = () => setOpened(null);

  const canPrev = useMemo(() => index > 0, [index]);
  const canNext = useMemo(() => index < slides.length - 1, [index, slides.length]);

  return (
    <aside ref={asideRef} className="h-full min-h-0 w-full bg-[#0D0D0D] text-white overflow-hidden relative">
      <div className="bg-[#75290E] h-20 flex items-center justify-between px-5">
        <h3 className="text-2xl font-staatliches tracking-wide">{buildingName.toUpperCase()}</h3>

        <button
          onClick={onMenu}
          className="w-12 h-12 grid place-items-center cursor-pointer"
          aria-label="Go to home"
          title="Menu"
        >
          <FontAwesomeIcon className="text-white text-xl" icon={faBars} width={40} height={40} />
        </button>
      </div>

      <div className="h-[calc(100%-80px)] min-h-0 flex flex-col">
        <div
          ref={listRef}
          className="
            flex-1 min-h-0 overflow-hidden
            px-5 pt-5 pb-5
            overscroll-contain [&::-webkit-scrollbar]:hidden
          "
          style={{ scrollbarWidth: 'none' }}
        >
          <div id="active-slide-wrap" className="h-full min-h-0">
            <SlideCard slide={slides[index]} onOpen={open} />
          </div>
        </div>

        <div className="h-20 px-6 flex items-center justify-between bg-[#0D0D0D] shrink-0 relative z-10">
          {canNext && (
            <button onClick={() => go(1)} className="flex items-center gap-3 cursor-pointer">
              <img src="/images/home/ArrowButton.png" className="h-10 w-10" alt="" />
              <span className="uppercase font-staatliches tracking-wide text-xl">Next</span>
            </button>
          )}
          {canPrev && (
            <button onClick={() => go(-1)} className="flex items-center gap-3 cursor-pointer">
              <span className="uppercase font-staatliches tracking-wide text-xl">Previous</span>
              <img src="/images/home/ArrowButton.png" className="h-10 w-10 rotate-180" alt="" />
            </button>
          )}
        </div>
      </div>

      {opened && (opened.mediaType === 'flipbook'
        ? <PdfFlipBook url={opened.src} caption={opened.caption} onClose={close} onFlipSfx={() => {
            try {
              void Promise
                .resolve(flipSfx())
                .catch(() => {});
            } catch { }
          }} />
        : <ImageLightbox src={opened.src} caption={opened.caption} onClose={close} />
      )}
    </aside>
  );
}

