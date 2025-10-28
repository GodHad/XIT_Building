'use client';
import { useEffect } from 'react';

const SOUND_URLS = [
  '/sounds/CLICK.wav',
  '/sounds/WHOOSH.wav',
  '/sounds/TOOLTIP.wav',
  '/sounds/POPOPOP.wav',
  '/sounds/FLIP.wav',
];

declare global {
  interface Window {
    __APP_AUDIO_CTX?: AudioContext | null;
    __APP_AUDIO_UNLOCKED?: boolean;
    __APP_AUDIO_BUFFERS?: Map<string, AudioBuffer>;
    __APP_AUDIO_MASTER?: {
      in: AudioNode;
      out: AudioNode;
      comp: DynamicsCompressorNode;
      gain: GainNode;
    };
  }
}

async function safariSafeDecode(ctx: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  return await new Promise((resolve, reject) => {
    const r = (ctx as any).decodeAudioData(
      data,
      (b: AudioBuffer) => resolve(b),
      (e: any) => reject(e)
    );
    if (r && typeof r.then === 'function') r.then(resolve, reject);
  });
}

export default function AudioBoot() {
  useEffect(() => {
    const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;

    const ctx = (window.__APP_AUDIO_CTX = window.__APP_AUDIO_CTX ?? new AC());
    const globalBuffers = (window.__APP_AUDIO_BUFFERS = window.__APP_AUDIO_BUFFERS ?? new Map());

    if (!window.__APP_AUDIO_MASTER) {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-12, ctx.currentTime);
      comp.knee.setValueAtTime(20, ctx.currentTime);
      comp.ratio.setValueAtTime(8, ctx.currentTime);
      comp.attack.setValueAtTime(0.003, ctx.currentTime);
      comp.release.setValueAtTime(0.1, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.85, ctx.currentTime);

      comp.connect(gain).connect(ctx.destination);
      window.__APP_AUDIO_MASTER = { in: comp, out: gain, comp, gain };
    }

    let removed = false;

    const unlock = async () => {
      try { if (ctx.state !== 'running') await ctx.resume(); } catch {}

      try {
        const b = ctx.createBuffer(1, 1, 44100);
        const s = ctx.createBufferSource();
        s.buffer = b; s.connect(ctx.destination); s.start(0);
      } catch {}

      window.__APP_AUDIO_UNLOCKED = true;
      detach();

      for (const url of SOUND_URLS) {
        try {
          if (globalBuffers.has(url)) continue;
          const res = await fetch(url, { cache: 'force-cache' });
          if (!res.ok) continue;
          const ab = await res.arrayBuffer();
          const buf = await safariSafeDecode(ctx, ab);
          globalBuffers.set(url, buf);
        } catch {  }
      }
    };

    const onInteract = () => { if (!window.__APP_AUDIO_UNLOCKED) unlock(); };
    const onVisibility = async () => {
      if (document.visibilityState === 'visible' && ctx.state !== 'running') {
        try { await ctx.resume(); } catch {}
      }
    };

    const attach = () => {
      window.addEventListener('pointerdown', onInteract, true);
      window.addEventListener('touchend',   onInteract, true);
      window.addEventListener('keydown',    onInteract, true);
      document.addEventListener('visibilitychange', onVisibility, false);
    };
    const detach = () => {
      if (removed) return;
      removed = true;
      window.removeEventListener('pointerdown', onInteract, true);
      window.removeEventListener('touchend',   onInteract, true);
      window.removeEventListener('keydown',    onInteract, true);
      document.removeEventListener('visibilitychange', onVisibility, false);
    };

    attach();
    return detach;
  }, []);

  return null;
}
