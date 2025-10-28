'use client';
import { useRef, useEffect } from 'react';

type PlayOpts = {
  gain?: number;
  minIntervalMs?: number;
  rate?: number;
};

declare global {
  interface Window {
    __APP_AUDIO_CTX?: AudioContext | null;
    __APP_AUDIO_BUFFERS?: Map<string, AudioBuffer>;
    __APP_AUDIO_MASTER?: {
      in: AudioNode;
      out: AudioNode;
      comp: DynamicsCompressorNode;
      gain: GainNode;
    };
  }
}
export {};

function getCtx(): AudioContext | null {
  const AC: any = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
  if (!AC) return null;
  let c = (typeof window !== 'undefined' ? window.__APP_AUDIO_CTX ?? null : null) as AudioContext | null;
  if (!c) {
    try { c = new AC(); } catch { return null; }
    if (typeof window !== 'undefined') window.__APP_AUDIO_CTX = c;
  }
  return c;
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

async function getBuffer(url: string, c: AudioContext): Promise<AudioBuffer> {
  const globalBuffers = (typeof window !== 'undefined'
    ? (window.__APP_AUDIO_BUFFERS = window.__APP_AUDIO_BUFFERS ?? new Map())
    : new Map<string, AudioBuffer>());

  const cached = globalBuffers.get(url);
  if (cached) return cached;

  const res = await fetch(url, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`Failed to fetch sound: ${url}`);
  const ab = await res.arrayBuffer();
  const buf = await safariSafeDecode(c, ab);
  globalBuffers.set(url, buf);
  return buf;
}

const lastPlayed = new Map<string, number>();

export function useSoundEffect(url: string) {
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  return (opts?: PlayOpts): void => {
    (async () => {
      const c = getCtx();
      if (!c) return;

      try { if (c.state !== 'running') await c.resume(); } catch {}

      const now = performance.now();
      const minGap = opts?.minIntervalMs ?? 50;
      const last = lastPlayed.get(url) ?? 0;
      if (now - last < minGap) return;
      lastPlayed.set(url, now);

      const buf = await getBuffer(url, c);
      if (!alive.current) return;

      const src = c.createBufferSource();
      src.buffer = buf;
      if (opts?.rate && opts.rate > 0) src.playbackRate.value = opts.rate;

      const gain = c.createGain();
      const vol = Math.max(0, Math.min(1, opts?.gain ?? 1));
      const t = c.currentTime;

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.005);

      const master = (typeof window !== 'undefined') ? window.__APP_AUDIO_MASTER : undefined;
      if (master) {
        src.connect(gain).connect(master.in);
      } else {
        src.connect(gain).connect(c.destination);
      }

      const startAt = c.currentTime + 0.015;
      try { src.start(startAt); } catch {  }
    })();
  };
}
