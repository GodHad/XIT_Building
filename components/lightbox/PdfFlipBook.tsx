'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ensureGsap } from '@/utils/gsapClient';
import LightboxShell from './LightboxShell';
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist/types/src/display/api';

type Props = {
  url: string; 
  onClose: () => void;
  onFlipSfx?: () => void;
  caption?: string;
};

export default function PdfFlipBook({ url, onClose, onFlipSfx, caption }: Props) {
  const gsap = ensureGsap();

  const isPdf = /\.pdf$/i.test(url);

  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);

  const [pageCount, setPageCount] = useState(0);
  const [spread, setSpread] = useState(0);
  const [turning, setTurning] = useState(false);

  const spreadRef  = useRef<HTMLDivElement | null>(null);
  const leftRef    = useRef<HTMLCanvasElement | null>(null);
  const rightRef   = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const renderTasks  = useRef(new WeakMap<HTMLCanvasElement, RenderTask>());
  const animationRef = useRef<gsap.core.Timeline | null>(null);

  const [arrowPos, setArrowPos] = useState<{left:{x:number,y:number}, right:{x:number,y:number}} | null>(null);

  const imgExtRef = useRef<'.jpg' | '.jpeg' | '.png' | '.webp'>('.jpg');
  const baseDir = url.replace(/\/$/, '');

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const detectImageExtension = useCallback(async (): Promise<string> => {
    const candidates = ['.jpg', '.jpeg', '.png', '.webp'] as const;
    for (const ext of candidates) {
      try {
        await loadImage(`${baseDir}/1${ext}`);
        imgExtRef.current = ext;
        return ext;
      } catch {}
    }
    imgExtRef.current = '.jpg';
    return '.jpg';
  }, [baseDir]);

  const discoverImageCount = useCallback(async (): Promise<number> => {
    await detectImageExtension();
    let n = 0;
    for (let i = 1; i <= 400; i++) { // safety cap
      try {
        await loadImage(`${baseDir}/${i}${imgExtRef.current}`);
        n = i;
      } catch {
        break;
      }
    }
    return n;
  }, [baseDir, detectImageExtension]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (isPdf) {
        const pdfjs = await import('pdfjs-dist');
        (pdfjs as any).GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const mod = await import('pdfjs-dist/build/pdf.mjs');
        const loadingTask = (mod as any).getDocument(url);
        const d: PDFDocumentProxy = await loadingTask.promise;
        if (!mounted) return;
        setDoc(d);
        setPageCount(d.numPages);
        setSpread(0);
      } else {
        const count = await discoverImageCount();
        if (!mounted) return;
        setDoc(null);
        setPageCount(count);
        setSpread(0);
      }
    })();

    return () => { mounted = false; };
  }, [url, isPdf, discoverImageCount]);

  const pagesForSpread = useCallback((s: number) => {
    if (s === 0) return { left: undefined as number | undefined, right: 1 };
    const left  = 2 * s;
    const right = (left + 1 <= pageCount) ? left + 1 : undefined;
    return { left, right };
  }, [pageCount]);

  const renderPageToPdf = useCallback(
    async (pageNum: number | undefined, canvas: HTMLCanvasElement | null) => {
      if (!doc || !canvas || !pageNum) return;

      const prev = renderTasks.current.get(canvas);
      if (prev) { try { prev.cancel(); } catch {} renderTasks.current.delete(canvas); }

      const page: PDFPageProxy = await doc.getPage(pageNum);
      const v = page.getViewport({ scale: 1 });
      const host = spreadRef.current; if (!host) return;

      const gap = 14;
      const availW = (host.clientWidth - gap) / 2;
      const availH = host.clientHeight;
      const fitH   = availH / v.height;
      const cssW   = v.width * fitH;
      const scale  = cssW > availW ? (availW / v.width) : fitH;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vp  = page.getViewport({ scale: scale * dpr });

      canvas.width  = Math.max(1, Math.floor(vp.width));
      canvas.height = Math.max(1, Math.floor(vp.height));

      canvas.style.width  = `${Math.floor(v.width  * scale)}px`;
      canvas.style.height = `${Math.floor(v.height * scale)}px`;
      canvas.style.display = 'block';
      canvas.style.opacity = '1';

      const ctx  = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const task = page.render({ canvasContext: ctx, viewport: vp } as any);
      renderTasks.current.set(canvas, task);
      try { await task.promise; } catch {}
      finally { if (renderTasks.current.get(canvas) === task) renderTasks.current.delete(canvas); }
    },
    [doc]
  );

  const renderPageToImage = useCallback(
    async (pageNum: number | undefined, canvas: HTMLCanvasElement | null) => {
      if (!canvas || !pageNum) return;
      const host = spreadRef.current; if (!host) return;

      const img = await loadImage(`${baseDir}/${pageNum}${imgExtRef.current}`);

      const gap = 14;
      const availW = (host.clientWidth - gap) / 2;
      const availH = host.clientHeight;

      const fitH   = availH / img.naturalHeight;
      const cssW   = img.naturalWidth * fitH;
      const scale  = cssW > availW ? (availW / img.naturalWidth) : fitH;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width  = Math.max(1, Math.floor(img.naturalWidth  * scale * dpr));
      canvas.height = Math.max(1, Math.floor(img.naturalHeight * scale * dpr));

      canvas.style.width  = `${Math.floor(img.naturalWidth  * scale)}px`;
      canvas.style.height = `${Math.floor(img.naturalHeight * scale)}px`;
      canvas.style.display = 'block';
      canvas.style.opacity = '1';

      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    },
    [baseDir]
  );

  const renderPageTo = useCallback(async (pageNum?: number, canvas?: HTMLCanvasElement | null) => {
    if (!pageNum || !canvas) return;
    if (isPdf) return renderPageToPdf(pageNum, canvas);
    return renderPageToImage(pageNum, canvas);
  }, [isPdf, renderPageToPdf, renderPageToImage]);

  const renderOffscreen = async (pageNum?: number) => {
    if (!pageNum) return null;
    const c = document.createElement('canvas');
    await renderPageTo(pageNum, c);
    return c;
  };

  const blit = (dst: HTMLCanvasElement | null, src: HTMLCanvasElement | null) => {
    if (!dst || !src) return;
    if (dst.width !== src.width || dst.height !== src.height) {
      dst.width  = src.width;
      dst.height = src.height;
    }
    const ctx = dst.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, dst.width, dst.height);
    ctx.drawImage(src, 0, 0, dst.width, dst.height);
  };

  const blank = (dst: HTMLCanvasElement | null) => {
    if (!dst) return;
    const ctx = dst.getContext('2d')!;
    ctx.save();
    ctx.fillStyle = '#2B2B2B';
    ctx.fillRect(0, 0, dst.width, dst.height);
    ctx.restore();
  };

  const placeArrows = useCallback(() => {
    const host = spreadRef.current, L = leftRef.current, R = rightRef.current;
    if (!host || !L || !R) return;
    const hr = host.getBoundingClientRect();
    const lr = L.getBoundingClientRect();
    const rr = R.getBoundingClientRect();
    const gap = 28;
    setArrowPos({
      left:  { x: Math.round(lr.left - hr.left) - gap,  y: Math.round(lr.top + lr.height/2 - hr.top) },
      right: { x: Math.round(rr.right - hr.left) + gap, y: Math.round(rr.top + rr.height/2 - hr.top) }
    });
  }, []);

  const renderSpread = useCallback(async () => {
    if (turning || pageCount === 0) return;
    const { left, right } = pagesForSpread(spread);
    const [offLeft, offRight] = await Promise.all([
      renderOffscreen(left),
      renderOffscreen(right),
    ]);

    if (offLeft) {
      blit(leftRef.current, offLeft);
    } else {
      const L = leftRef.current, R = rightRef.current;
      if (L && R) {
        if (L.width !== R.width || L.height !== R.height) {
          L.width = R.width;
          L.height = R.height;
          L.style.width = R.style.width;
          L.style.height = R.style.height;
        }
      }
      blank(leftRef.current);
    }

    if (offRight) blit(rightRef.current, offRight); else blank(rightRef.current);

    placeArrows();
  }, [turning, pageCount, spread, pagesForSpread, renderOffscreen, placeArrows]);

  useEffect(() => { renderSpread(); }, [renderSpread]);

  useEffect(() => {
    let t: any;
    const onR = () => { clearTimeout(t); t = setTimeout(() => { renderSpread(); placeArrows(); }, 120); };
    window.addEventListener('resize', onR);
    return () => { window.removeEventListener('resize', onR); clearTimeout(t); };
  }, [renderSpread, placeArrows]);

  const hasPrev = spread > 0;
  const hasNext = (() => {
    const { right } = pagesForSpread(spread);
    return !!right && right < pageCount;
  })();

  const makeSheet = (side: 'left'|'right', frontURL: string, backURL: string) => {
    const host = spreadRef.current!, overlay = overlayRef.current!;
    overlay.innerHTML = '';
    overlay.style.perspective = '2000px';

    const target = side === 'right' ? rightRef.current! : leftRef.current!;
    const tr = target.getBoundingClientRect();
    const hr = host.getBoundingClientRect();

    const L = Math.round(tr.left - hr.left);
    const T = Math.round(tr.top  - hr.top);
    const W = Math.round(tr.width);
    const H = Math.round(tr.height);

    const sheet = document.createElement('div');
    sheet.className = 'absolute will-change-transform';
    Object.assign(sheet.style, {
      left: `${L}px`, top: `${T}px`, width: `${W}px`, height: `${H}px`,
      transformOrigin: side === 'right' ? 'left center' : 'right center',
      transformStyle: 'preserve-3d',
    } as Partial<CSSStyleDeclaration>);

    const mkFace = (src: string, extra?: string) => {
      const img = document.createElement('img');
      img.src = src;
      const s = img.style;
      s.position = 'absolute';
      s.top = s.right = s.bottom = s.left = '0';
      s.borderRadius = '8px';
      s.transform = extra || 'translateZ(0)';
      s.setProperty('backface-visibility', 'hidden');
      s.setProperty('-webkit-backface-visibility', 'hidden');
      return img;
    };

    const shade = document.createElement('div');
    shade.className = 'turn-shade';
    Object.assign(shade.style, {
      position: 'absolute', inset: '0',
      mixBlendMode: 'multiply', opacity: '0',
      borderRadius: '8px', pointerEvents: 'none',
      background: side === 'right'
        ? 'linear-gradient(90deg, rgba(0,0,0,.22), rgba(0,0,0,0) 45%)'
        : 'linear-gradient(270deg, rgba(0,0,0,.22), rgba(0,0,0,0) 45%)',
    } as Partial<CSSStyleDeclaration>);

    sheet.appendChild(mkFace(frontURL));
    sheet.appendChild(mkFace(backURL, 'rotateY(180deg)'));
    sheet.appendChild(shade);
    overlay.appendChild(sheet);
    return sheet;
  };

  const flipNext = async () => {
    const { right } = pagesForSpread(spread);
    if (!hasNext || !rightRef.current || turning || !right) return;
    if (animationRef.current) { animationRef.current.kill(); animationRef.current = null; }
    setTurning(true);
    onFlipSfx?.();

    const nextSpread = spread + 1;
    const nxt = pagesForSpread(nextSpread);

    const [offLeft, offRight] = await Promise.all([
      renderOffscreen(nxt.left),
      renderOffscreen(nxt.right),
    ]);

    const frontURL = rightRef.current.toDataURL('image/png');
    const backURL  = offLeft ? offLeft.toDataURL('image/png') : frontURL;
    const sheet = makeSheet('right', frontURL, backURL);

    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    animationRef.current = tl;

    tl.set(sheet, { rotateY: 0 })
      .to('.turn-shade', { opacity: 0.22, duration: 0.22 }, 0)
      .add(() => { if (offRight) blit(rightRef.current, offRight); else blank(rightRef.current); }, 0.01)
      .to(sheet, { rotateY: -179.5, duration: 0.65 }, 0)
      .add(() => { if (offLeft) blit(leftRef.current, offLeft); else blank(leftRef.current); })
      .to(sheet, { rotateY: -180, duration: 0.02 })
      .to('.turn-shade', { opacity: 0.0, duration: 0.10 }, '<')
      .add(() => {
        if (overlayRef.current) overlayRef.current.innerHTML = '';
        setSpread(nextSpread);
        setTurning(false);
        animationRef.current = null;
        placeArrows();
      });

    await tl.then();
  };

  const flipPrev = async () => {
    const { left } = pagesForSpread(spread);
    if (!hasPrev || !leftRef.current || turning || !left) return;
    if (animationRef.current) { animationRef.current.kill(); animationRef.current = null; }
    setTurning(true);
    onFlipSfx?.();

    const prevSpread = spread - 1;
    const prv = pagesForSpread(prevSpread);

    const [offLeft, offRight] = await Promise.all([
      renderOffscreen(prv.left),
      renderOffscreen(prv.right),
    ]);

    const frontURL = leftRef.current.toDataURL('image/png');
    const backURL  = offRight ? offRight.toDataURL('image/png') : frontURL;
    const sheet = makeSheet('left', frontURL, backURL);

    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    animationRef.current = tl;

    tl.set(sheet, { rotateY: 0 })
      .to('.turn-shade', { opacity: 0.22, duration: 0.22 }, 0)
      .add(() => { if (offLeft) blit(leftRef.current, offLeft); else blank(leftRef.current); }, 0.01)
      .to(sheet, { rotateY: 179.5, duration: 0.65 }, 0)
      .add(() => { if (offRight) blit(rightRef.current, offRight); else blank(rightRef.current); })
      .to(sheet, { rotateY: 180, duration: 0.02 })
      .to('.turn-shade', { opacity: 0.0, duration: 0.10 }, '<')
      .add(() => {
        if (overlayRef.current) overlayRef.current.innerHTML = '';
        setSpread(prevSpread);
        setTurning(false);
        animationRef.current = null;
        placeArrows();
      });

    await tl.then();
  };

  return (
    <LightboxShell onClose={onClose}>
      <div className="flex-1 min-h-0 flex flex-col bg-[#2B2B2B]">
        <div className="flex-1 min-h-0 flex items-center justify-center px-8">
          <div className="w-[min(1120px,calc(100vw-10rem))]">
            <div
              ref={spreadRef}
              className="
                relative
                w-full
                h-[min(72vh,calc(100vh-260px))]
                grid grid-cols-2
              "
            >
              <div className="pointer-events-none absolute hidden top-2 bottom-2 left-1/2 -translate-x-1/2 w-px bg-white/15" />

              <div className="rounded-lg overflow-hidden flex justify-end items-center">
                <canvas ref={leftRef} />
              </div>
              <div className="rounded-lg overflow-hidden flex justify-start items-center">
                <canvas ref={rightRef} />
              </div>

              <div ref={overlayRef} className="absolute inset-0 pointer-events-none z-10" />

              {arrowPos && spread > 0 && (
                <button
                  aria-label="Previous page"
                  onClick={flipPrev}
                  disabled={turning}
                  className="absolute z-20 w-12 h-12 md:w-14 md:h-14 rounded-full bg-transparent grid place-items-center disabled:opacity-40 cursor-pointer"
                  style={{
                    left: `${arrowPos.left.x}px`,
                    top: `${arrowPos.left.y}px`,
                    transform: 'translate(-50%,-50%)',
                  }}
                >
                  <img src="/images/home/ArrowButton.png" className="w-10 h-10 rotate-90" alt="" />
                </button>
              )}
              {arrowPos && (() => {
                const { right } = pagesForSpread(spread);
                return !!right && right < pageCount;
              })() && (
                <button
                  aria-label="Next page"
                  onClick={flipNext}
                  disabled={turning}
                  className="absolute z-20 w-12 h-12 md:w-14 md:h-14 rounded-full bg-transparent grid place-items-center disabled:opacity-40 cursor-pointer"
                  style={{
                    left: `${arrowPos!.right.x}px`,
                    top: `${arrowPos!.right.y}px`,
                    transform: 'translate(-50%,-50%)',
                  }}
                >
                  <img src="/images/home/ArrowButton.png" className="w-10 h-10 rotate-270" alt="" />
                </button>
              )}
            </div>

            {caption && (
              <div className="mt-4 text-center text-lg font-lexendDeca text-white/90">
                {caption}
              </div>
            )}
          </div>
        </div>
      </div>
    </LightboxShell>
  );
}
