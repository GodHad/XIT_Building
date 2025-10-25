let ctx: AudioContext | null = null;
let master: GainNode;
let comp: DynamicsCompressorNode;
const buffers = new Map<string, AudioBuffer>();
const playingByKey = new Map<string, AudioBufferSourceNode>();

async function ensureCtx(): Promise<AudioContext> {
  if (ctx) return ctx;
  ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

  master = ctx.createGain();
  master.gain.value = 0.85;

  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 30;
  comp.ratio.value = 12;
  comp.attack.value = 0.003;
  comp.release.value = 0.25;

  comp.connect(master);
  master.connect(ctx.destination);
  return ctx;
}

export async function resumeAudio() {
  const c = await ensureCtx();
  if (c.state !== 'running') await c.resume();
}

export async function loadFx(id: string, url: string) {
  const c = await ensureCtx();
  if (buffers.has(id)) return buffers.get(id)!;
  const res = await fetch(url, { cache: 'force-cache' });
  const arr = await res.arrayBuffer();
  const buf = await c.decodeAudioData(arr);
  buffers.set(id, buf);
  return buf;
}

type PlayOpts = {
  volume?: number;
  rate?: number;
  exclusiveKey?: string;
};

export async function playFx(id: string, opts: PlayOpts = {}) {
  const c = await ensureCtx();
  if (c.state !== 'running') await c.resume();

  const buf = buffers.get(id);
  if (!buf) return;

  const src = c.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = opts.rate ?? 1;

  const g = c.createGain();
  const vol = Math.min(1, Math.max(0, opts.volume ?? 1));
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + 0.006);
  g.gain.setValueAtTime(vol, c.currentTime + Math.max(0, buf.duration - 0.02));
  g.gain.linearRampToValueAtTime(0, c.currentTime + buf.duration);

  src.connect(g);
  g.connect(comp);

  if (opts.exclusiveKey) {
    playingByKey.get(opts.exclusiveKey)?.stop();
    playingByKey.set(opts.exclusiveKey, src);
    src.onended = () => {
      if (playingByKey.get(opts.exclusiveKey!) === src) playingByKey.delete(opts.exclusiveKey!);
    };
  }

  src.start();
}
