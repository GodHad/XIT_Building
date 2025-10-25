'use client';
import { useEffect } from 'react';
import { resumeAudio, loadFx } from '@/utils/audioEngine';

export default function AudioBoot() {
  useEffect(() => {
    let armed = false;
    const arm = async () => {
      if (armed) return;
      armed = true;
      await resumeAudio();
      await Promise.all([
        loadFx('click',   '/sounds/CLICK.wav'),
        loadFx('flip',    '/sounds/FLIP.wav'),
        loadFx('whoosh',  '/sounds/WHOOSH.wav'),
        loadFx('tooltip', '/sounds/TOOLTIP.wav'),
        loadFx('pop',     '/sounds/POPOPOP.wav'),
      ]).catch(() => {});
    };

    const events = ['pointerdown','mousedown','touchstart','keydown'];
    events.forEach(ev => window.addEventListener(ev, arm, { once: true, passive: true }));
    const onVis = () => { if (document.visibilityState === 'visible') resumeAudio(); }
    document.addEventListener('visibilitychange', onVis);

    return () => {
      events.forEach(ev => window.removeEventListener(ev, arm));
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return null;
}
