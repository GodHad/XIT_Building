'use client';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { ensureGsap } from '@/utils/gsapClient';
import { useRouter } from 'next/navigation';
import { useSoundEffect } from '@/hooks/useSoundEffect';
import { tracks } from '@/data/buildings';

export default function HomeScreen() {
  const gsap = ensureGsap();
  const router = useRouter();

  const clickSfx = useSoundEffect('/sounds/button2.mp3');
  const popSfx   = useSoundEffect('/sounds/POPOPOP.mp3');

  const PAD = 40;
  const GUTTER_TO_SIDEBAR = 12;
  const SIDEBAR_W = '23%';
  const OVERSCAN = 1.30;

  const DUR = {
    fadeFromBlack: 0.35,
    mapFade:       0.50,
    whiteBoxIn:    0.70,
    logoGrow:      1.35,
    assocIn:       0.40,
    subtitleIn:    0.55,
    headerLogoIn:  0.60,
    sidebarDelayAfterHero: 0.80,
    sidebarSlide:  0.85,
    pushShift:     0.95,
    itemsPop:      0.12,
    exploreIn:     0.35,
    exitFade:      0.25,
  } as const;

  const rootRef        = useRef<HTMLDivElement>(null);
  const mapWrapRef     = useRef<HTMLDivElement>(null);
  const blackVeilRef   = useRef<HTMLDivElement>(null);

  const whiteBoxRef    = useRef<HTMLDivElement>(null);
  const boundsRef      = useRef<HTMLDivElement>(null);

  const headerLogoRef  = useRef<HTMLDivElement>(null);
  const assocWrapRef   = useRef<HTMLDivElement>(null);
  const centerStackRef = useRef<HTMLDivElement>(null);
  const logoImgRef     = useRef<HTMLImageElement>(null);
  const subtitleRef    = useRef<HTMLParagraphElement>(null);

  const sidebarRef       = useRef<HTMLDivElement>(null);
  const sidebarTitleRef  = useRef<HTMLHeadingElement>(null);
  const sidebarItemsRef  = useRef<HTMLButtonElement[]>([]);
  const exploreWrapRef   = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const bounds = boundsRef.current;
    const logo   = logoImgRef.current;
    const subtitle = subtitleRef.current;
    const center = centerStackRef.current;
    const assoc  = assocWrapRef.current;

    if (!bounds || !logo || !subtitle || !center || !assoc) return;

    const boxW = bounds.clientWidth;
    const targetW = Math.round(boxW * 0.655);
    const startW  = Math.min(220, Math.floor(targetW * 0.35));

    gsap.set(center,  { opacity: 1 });
    gsap.set(logo,    { width: startW, opacity: 0 });
    gsap.set(subtitle,{ opacity: 0, y: 6 });
    gsap.set(assoc,   { opacity: 0, y: -12 });
    gsap.set(headerLogoRef.current, { opacity: 0, y: -16 });
  }, [gsap]);

  useEffect(() => {
    const wrap = mapWrapRef.current, root = rootRef.current;
    if (!wrap || !root) return;

    wrap.style.transformOrigin = '50% 50%';

    let x = 0, y = 0;
    let angle = Math.random() * Math.PI * 2;

    const bounds = () => {
      const vw = root.clientWidth, vh = root.clientHeight;
      return {
        maxX: (vw * (OVERSCAN - 1)) / 2,
        maxY: (vh * (OVERSCAN - 1)) / 2,
        speed: Math.max(vw, vh) * 0.0085,
      };
    };
    let { maxX, maxY, speed } = bounds();

    const reflect = (ang: number, axis: 'vertical'|'horizontal') => {
      const base = axis === 'vertical' ? Math.PI - ang : -ang;
      const jitter = (Math.random() - 0.5) * (Math.PI / 5);
      return base + jitter;
    };
    const norm = (a: number) => ((a + Math.PI) % (2 * Math.PI)) - Math.PI;

    let last = performance.now(), raf = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000; last = now;

      x += Math.cos(angle) * speed * dt;
      y += Math.sin(angle) * speed * dt;

      let hitX = false, hitY = false;
      if (x >  maxX) { x =  maxX; hitX = true; }
      if (x < -maxX) { x = -maxX; hitX = true; }
      if (y >  maxY) { y =  maxY; hitY = true; }
      if (y < -maxY) { y = -maxY; hitY = true; }

      if (hitX || hitY) {
        if (hitX) angle = reflect(angle, 'vertical');
        if (hitY) angle = reflect(angle, 'horizontal');
        angle = norm(angle);
      }

      wrap.style.transform = `translate(${x}px, ${y}px) scale(${OVERSCAN})`;
      raf = requestAnimationFrame(tick);
    };

    gsap.set(wrap, { opacity: 0, scale: OVERSCAN, x: 0, y: 0 });
    gsap.to(wrap, { opacity: 1, duration: DUR.mapFade, onComplete: () => {
      raf = requestAnimationFrame((t) => { last = t; tick(t); });
    }});

    const onResize = () => {
      const b = bounds();
      maxX = b.maxX; maxY = b.maxY; speed = b.speed;
    };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, [gsap]);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    tl.fromTo(blackVeilRef.current, { opacity: 1 }, { opacity: 0, duration: DUR.fadeFromBlack });

    tl.fromTo(
      whiteBoxRef.current,
      { opacity: 0, scale: 0.985 },
      { opacity: 1, scale: 1, duration: DUR.whiteBoxIn, ease: 'power3.out' },
      '-=0.05'
    );

    tl.add(() => {
      const bounds = boundsRef.current!;
      const logo   = logoImgRef.current!;
      const subtitle = subtitleRef.current!;
      const assoc  = assocWrapRef.current!;
      const boxW = bounds.clientWidth;
      const targetW = Math.round(boxW * 0.655);

      gsap.to(logo,     { width: targetW, opacity: 1, duration: DUR.logoGrow,    ease: 'power3.out' });
      gsap.to(assoc,    { y: 0, opacity: 1, duration: DUR.assocIn,               ease: 'power2.out', delay: 0.15 });
      gsap.to(subtitle, { y: 0, opacity: 1, duration: DUR.subtitleIn,            ease: 'power2.out', delay: DUR.logoGrow - 0.15 });
      gsap.to(headerLogoRef.current, {
        y: 0, opacity: 1, duration: DUR.headerLogoIn, delay: DUR.logoGrow + DUR.subtitleIn - 0.1, ease: 'power2.out'
      });
    });

    tl.addLabel('afterHero', `+=${DUR.sidebarDelayAfterHero}`);
    tl.add(() => {
      const sb = sidebarRef.current!;
      const cs = centerStackRef.current!;
      const wb = whiteBoxRef.current!;
      const bounds = boundsRef.current!;
      const sidebarW = sb.offsetWidth;

      gsap.fromTo(sb, { x: '100%' }, { x: '0%', duration: DUR.sidebarSlide, ease: 'power3.inOut' });
      gsap.to(cs, { x: -sidebarW * 0.46, duration: DUR.pushShift, ease: 'power3.inOut' });
      gsap.to([wb, bounds], {
        right: PAD + sidebarW + GUTTER_TO_SIDEBAR,
        duration: DUR.pushShift,
        ease: 'power3.inOut'
      });
    }, 'afterHero');

    tl.fromTo(sidebarTitleRef.current, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.28 }, 'afterHero+=0.10');
    sidebarItemsRef.current.forEach((el, idx) => {
      tl.fromTo(
        el,
        { y: -10, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: DUR.itemsPop },
        `afterHero+=${0.22 + idx * 0.06}`
      );
    });
    tl.call(() => popSfx(), undefined, 'afterHero+=0.25');

    tl.fromTo(exploreWrapRef.current, { x: -22, opacity: 0 }, { x: 0, opacity: 1, duration: DUR.exploreIn }, 'afterHero+=0.45');

    return () => { tl.kill(); };
  }, [gsap, popSfx]);

  const navigateWithExit = async (to: string) => {
    clickSfx();
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    tl.to([sidebarTitleRef.current, ...sidebarItemsRef.current], { opacity: 0, y: 6, duration: DUR.exitFade, stagger: 0.02 }, 0);
    tl.to(exploreWrapRef.current,  { opacity: 0, x: -8, duration: DUR.exitFade }, 0);
    tl.to([logoImgRef.current, assocWrapRef.current, subtitleRef.current, headerLogoRef.current], { opacity: 0, y: 6, duration: DUR.exitFade }, 0.02);
    tl.to(whiteBoxRef.current, { opacity: 0, duration: DUR.exitFade }, 0.04);

    await tl.then();
    router.push(to);
  };

  const goMap = () => navigateWithExit('/map');
  const goBuilding = (id: string) => navigateWithExit(`/location/${id}`);

  return (
    <div ref={rootRef} className="relative w-full h-full overflow-hidden">
      <div ref={blackVeilRef} className="absolute inset-0 bg-black z-30 pointer-events-none" />

      <div ref={mapWrapRef} className="absolute inset-0 opacity-0">
        <img src="/images/home/Dalhart_BaseMap.jpg" alt="Map" className="w-full h-full object-cover select-none pointer-events-none" />
      </div>

      <div
        ref={whiteBoxRef}
        className="absolute rounded-2xl bg-white/30 backdrop-blur-sm ring-1 ring-black/10 shadow-[0_40px_120px_rgba(0,0,0,0.35)]"
        style={{ left: PAD, right: PAD, top: PAD, bottom: PAD }}
      />

      <div
        ref={boundsRef}
        className="absolute pointer-events-none"
        style={{ left: PAD, right: PAD, top: PAD, bottom: PAD }}
      >
        <div className="relative h-full w-full">
          
        </div>
      </div>

      <div className="relative z-10 w-full h-full flex items-center justify-center pointer-events-none">
        <div ref={centerStackRef} className="text-center space-y-6">
          <div ref={assocWrapRef} className="flex items-center justify-center gap-12 opacity-0 mb-5">
            <img src="/images/home/XIT_Logo.png" alt="XIT Museum" className="h-20 object-contain" />
            <img src="/images/home/HD_logo_handcraftedbyHD.png" alt="Hartsfield Design" className="h-20 object-contain" />
          </div>

          <img
            ref={logoImgRef}
            src="/images/home/TheHistoricBuildingsofDalhart_Logo.png"
            alt="The Historic Buildings of Dalhart"
            className="mx-auto object-contain pointer-events-auto mt-5"
            style={{ opacity: 0, width: 1 }}
          />

          <p ref={subtitleRef} className="text-black/80 text-3xl font-staatliches mt-2">
            Donations through The Panhandle Give<br />and Knowles Family Fund XIT Ranch
          </p>
        </div>
      </div>

      <div ref={exploreWrapRef} className="absolute left-14 bottom-14 z-20 opacity-0">
        <button onClick={goMap} className="flex items-center gap-3 cursor-pointer">
          <img src="/images/home/MapButton.png" alt="" className="h-12 w-12" />
          <span className="text-[#75290E] text-xl font-semibold">Explore full map</span>
        </button>
      </div>

      <aside
        ref={sidebarRef}
        className="absolute top-0 right-0 h-full translate-x-full bg-black text-white"
        style={{ width: SIDEBAR_W }}
      >
        <div className="p-6 h-full flex flex-col">
          <h2 ref={sidebarTitleRef} className="text-2xl text-center tracking-wide opacity-0">
            Select a building to<br />explore through the years
          </h2>

          <div className="mt-4 space-y-2 overflow-y-auto custom-scroll pr-1 flex-1">
            {tracks.map((b, i) => (
              <button
                key={b.id}
                ref={el => { if (el) sidebarItemsRef.current[i] = el; }}
                onClick={() => goBuilding(b.id)}
                className="w-full text-left text-xl px-3 py-2 rounded-md bg-white text-[#75290E] font-staatliches hover:bg-[#75290E] hover:text-white"
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
