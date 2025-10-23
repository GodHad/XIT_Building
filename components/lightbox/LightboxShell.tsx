'use client';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ensureGsap } from '@/utils/gsapClient';
import { useSoundEffect } from '@/hooks/useSoundEffect';

export default function LightboxShell({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  const gsap = ensureGsap();
  const panelRef = useRef<HTMLDivElement | null>(null);

  const clickSfx = useSoundEffect('/sounds/click.mp3');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (panelRef.current) {
      gsap.fromTo(panelRef.current, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.22, ease: 'power2.out' });
    }
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => { html.style.overflow = prevOverflow; };
  }, [gsap]);

  const content = (
    <div className="fixed inset-0 z-[9000]">
      <button
        aria-label="Close lightbox"
        onClick={onClose}
        className="absolute inset-0 bg-black"
      />

      <div className="absolute inset-0 flex items-center justify-center p-15 md:p-15">
        <div
          ref={panelRef}
          className="
            relative flex flex-col overflow-hidden
            w-full h-full
            max-w-[calc(100vw-3rem)] max-h-[calc(100vh-3rem)]
            bg-[#1B1B1B] text-white rounded-xl
          "
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={() => { clickSfx(); setTimeout(() => onClose(), 200); }}
            aria-label="Close"
            className="absolute top-0 right-4 z-10 w-9 h-9 grid place-items-center text-white/90 hover:text-white text-5xl cursor-pointer"
          >
            ×
          </button>

          <div className="flex-1 min-h-0 relative flex flex-col bg-[#2B2B2B]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}
