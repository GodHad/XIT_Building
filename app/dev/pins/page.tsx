'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ensureGsap, Draggable } from '@/utils/gsapClient';

type PinRow = {
  id: string;
  local: { x: number; y: number };
  base: { x: number; y: number };
};

export default function DevPins() {
  const gsap = ensureGsap();

  const [BW, setBW] = useState(5326);
  const [BH, setBH] = useState(8691);
  const [L, setL]  = useState(681);
  const [T, setT]  = useState(463);
  const [R, setR]  = useState(704);
  const [B, setB]  = useState(453);

  const [imgSrc, setImgSrc] = useState('/images/building_content/Schools/Schools_LocationPins.jpg');
  const [prefix, setPrefix] = useState('Schools');

  const [pins, setPins] = useState<PinRow[]>([]);
  const [nat, setNat] = useState({ w: 0, h: 0 });

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef  = useRef<HTMLDivElement | null>(null);
  const planeRef    = useRef<HTMLDivElement | null>(null);
  const imgRef      = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (contentRef.current) gsap.set(contentRef.current, { transformOrigin: '0 0' });
    const el = contentRef.current;
    if (!el) return;
    const d = Draggable.create(el, {
      type: 'x,y',
      bounds: undefined,
      cursor: 'grab',
      activeCursor: 'grabbing',
    });
    return () => d.forEach(x => x.kill());
  }, [gsap]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const onLoad = () => setNat({ w: img.naturalWidth, h: img.naturalHeight });
    if (img.complete && img.naturalWidth) onLoad();
    else img.addEventListener('load', onLoad);
    return () => img.removeEventListener('load', onLoad);
  }, [imgSrc]);

  useEffect(() => {
    const view = viewportRef.current, el = contentRef.current;
    if (!view || !el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1 / 1.12 : 1.12;

      const cur = (gsap.getProperty(el, 'scale') as number) || 1;
      const next = Math.min(Math.max(cur * factor, 0.2), 6);

      const rect = view.getBoundingClientRect();
      const vx = e.clientX - rect.left;
      const vy = e.clientY - rect.top;

      const tx = (gsap.getProperty(el, 'x') as number) || 0;
      const ty = (gsap.getProperty(el, 'y') as number) || 0;

      const cx = (vx - tx) / cur;
      const cy = (vy - ty) / cur;

      const nx = vx - cx * next;
      const ny = vy - cy * next;

      gsap.to(el, { scale: next, x: nx, y: ny, duration: 0.12, ease: 'power2.out' });
    };

    view.addEventListener('wheel', onWheel, { passive: false });
    return () => view.removeEventListener('wheel', onWheel);
  }, [gsap]);

  const cropW_on_base = useMemo(() => BW - L - R, [BW, L, R]);
  const cropH_on_base = useMemo(() => BH - T - B, [BH, T, B]);

  const toBaseNorm = (lx: number, ly: number) => {
    const bx = (L + lx * cropW_on_base) / BW;
    const by = (T + ly * cropH_on_base) / BH;
    return { x: bx, y: by };
  };

  useEffect(() => {
    const view = viewportRef.current, el = contentRef.current;
    if (!view || !el) return;

    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('#pin-controls')) return;

      const rect = view.getBoundingClientRect();
      const vx = e.clientX - rect.left;
      const vy = e.clientY - rect.top;

      const tx = (gsap.getProperty(el, 'x') as number) || 0;
      const ty = (gsap.getProperty(el, 'y') as number) || 0;
      const s  = (gsap.getProperty(el, 'scale') as number) || 1;

      const px = (vx - tx) / s;
      const py = (vy - ty) / s;

      if (!nat.w || !nat.h) return;

      const lx = +(px / nat.w).toFixed(6);
      const ly = +(py / nat.h).toFixed(6);

      const base = toBaseNorm(lx, ly);

      setPins(prev => [
        ...prev,
        {
          id: `${prefix}_${prev.length + 1}`,
          local: { x: lx, y: ly },
          base:  { x: +base.x.toFixed(6), y: +base.y.toFixed(6) },
        },
      ]);
    };

    view.addEventListener('click', onClick);
    return () => view.removeEventListener('click', onClick);
  }, [gsap, nat.w, nat.h, prefix, BW, BH, L, T, R, B, cropW_on_base, cropH_on_base]);

  const displayPins = useMemo(
    () => pins.map((p, i) => ({
      id: p.id,
      left: `${p.local.x * 100}%`,
      top:  `${p.local.y * 100}%`,
      n: i + 1,
    })),
    [pins]
  );

  const onUpload = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImgSrc(reader.result as string);
    reader.readAsDataURL(file);
  };
  const resetView = () => {
    const el = contentRef.current; if (!el) return;
    gsap.to(el, { x: 0, y: 0, scale: 1, duration: 0.2, ease: 'power2.inOut' });
  };
  const removeOne = (idx: number) => setPins(prev => prev.filter((_, i) => i !== idx));
  const clearAll  = () => setPins([]);
  const copyBaseJSON = async () => {
    const out = pins.map(p => ({ id: p.id, x: p.base.x, y: p.base.y }));
    const json = JSON.stringify(out, null, 2);
    try { await navigator.clipboard.writeText(json); alert('Copied base-normalized JSON'); }
    catch { console.log(json); alert('Copy failed. JSON printed to console.'); }
  };

  return (
    <div className="w-full h-full grid grid-cols-[minmax(320px,380px)_1fr] gap-4 p-4">
      <div id="pin-controls" className="bg-white/95 border border-black/10 rounded-xl p-4 flex flex-col gap-3">
        <h1 className="text-lg font-semibold">Pin Capture (Building → Base)</h1>

        <label className="text-sm font-medium">Prefix</label>
        <input value={prefix} onChange={e => setPrefix(e.target.value)}
               className="px-3 py-2 rounded border border-black/20" />

        <label className="text-sm font-medium">Building map image (path or upload)</label>
        <input value={imgSrc} onChange={e => setImgSrc(e.target.value)}
               className="px-3 py-2 rounded border border-black/20"
               placeholder="/images/building_content/Schools/Schools_LocationPins.jpg" />
        <input type="file" accept="image/*" onChange={e => onUpload(e.target.files?.[0])} />

        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-semibold">Base geometry (px)</summary>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <label className="flex items-center gap-2">Base W <input type="number" value={BW} onChange={e => setBW(+e.target.value)} className="w-24 px-2 py-1 border rounded"/></label>
            <label className="flex items-center gap-2">Base H <input type="number" value={BH} onChange={e => setBH(+e.target.value)} className="w-24 px-2 py-1 border rounded"/></label>
            <label className="flex items-center gap-2">Left   <input type="number" value={L}  onChange={e => setL(+e.target.value)}  className="w-24 px-2 py-1 border rounded"/></label>
            <label className="flex items-center gap-2">Top    <input type="number" value={T}  onChange={e => setT(+e.target.value)}  className="w-24 px-2 py-1 border rounded"/></label>
            <label className="flex items-center gap-2">Right  <input type="number" value={R}  onChange={e => setR(+e.target.value)}  className="w-24 px-2 py-1 border rounded"/></label>
            <label className="flex items-center gap-2">Bottom <input type="number" value={B}  onChange={e => setB(+e.target.value)}  className="w-24 px-2 py-1 border rounded"/></label>
          </div>
          <div className="mt-2 text-xs text-black/60">
            Crop-on-base: {BW - L - R}px × {BH - T - B}px
          </div>
        </details>

        <div className="mt-3 text-sm text-black/70">
          Wheel to zoom (about cursor). Drag to pan. Click the <b>building map</b> to drop a pin.  
          We convert local (building) → base-normalized with:<br/>
          <code>bx = (L + lx*(BW - L - R)) / BW</code>, <code>by = (T + ly*(BH - T - B)) / BH</code>
        </div>

        <div className="mt-2 flex gap-2">
          <button onClick={copyBaseJSON} className="px-3 py-2 rounded bg-[#7b1d1d] text-white">Copy Base JSON</button>
          <button onClick={clearAll} className="px-3 py-2 rounded bg-black text-white">Clear All</button>
          <button onClick={resetView} className="ml-auto px-3 py-2 rounded bg-black/80 text-white">Reset View</button>
        </div>

        <ul className="mt-2 max-h-[40vh] overflow-auto pr-1 space-y-2 text-xs">
          {pins.map((p, i) => (
            <li key={p.id} className="border border-black/10 rounded p-2 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <input
                  value={p.id}
                  onChange={e => setPins(prev => prev.map((pp, idx) => idx === i ? { ...pp, id: e.target.value } : pp))}
                  className="px-2 py-1 rounded border border-black/20 text-sm w-44"
                />
                <button className="ml-auto px-2 py-1 rounded bg-black/5 hover:bg-black/10" onClick={() => {
                  setPins(prev => prev.filter((_, idx) => idx !== i));
                }}>Delete</button>
              </div>
              <div className="grid grid-cols-2 gap-x-4">
                <div>local: x={p.local.x.toFixed(6)}, y={p.local.y.toFixed(6)}</div>
                <div>base:  x={p.base.x.toFixed(6)},  y={p.base.y.toFixed(6)}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative rounded-xl border border-black/10 overflow-hidden">
        <div ref={viewportRef} className="absolute inset-0 bg-neutral-100">
          <div ref={contentRef} className="absolute top-0 left-0 will-change-transform">
            <div ref={planeRef} className="relative" style={{ width: nat.w || undefined, height: nat.h || undefined }}>
              <img
                ref={imgRef}
                src={imgSrc}
                alt="Building map"
                draggable={false}
                className="block select-none pointer-events-none w-full h-auto"
              />
              <div className="absolute inset-0 pointer-events-none">
                {displayPins.map(p => (
                  <div key={p.id} className="absolute"
                       style={{ left: p.left, top: p.top, transform: 'translate(-50%, -100%)' }}>
                    <img src="/images/home/LocationPin_Icon.png" className="h-9 w-9 drop-shadow" alt="" />
                    <span className="absolute left-1/2 -translate-x-1/2 -bottom-4 text-[10px] bg-white/90 px-1 rounded">{p.n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
