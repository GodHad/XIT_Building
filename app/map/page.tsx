'use client';
import { useEffect, useRef, useMemo, useState } from 'react';
import PageWrapper from '@/components/PageWrapper';
import MapCanvas from '@/components/map/MapCanvas';
import { ensureGsap } from '@/utils/gsapClient';
import { useRouter } from 'next/navigation';
import { useSoundEffect } from '@/hooks/useSoundEffect';
import { tracks } from '@/data/buildings';
import type { Pin } from '@/data/types';
import { setHeapSnapshotNearHeapLimit } from 'v8';

function useFlattenedPins() {
  return useMemo(() => {
    const pins: Pin[] = [];
    const owner: Record<string, string> = {};
    for (const b of tracks) {
      for (const p of b.pins) {
        const uid = `${b.id}:${p.id}`;
        pins.push({ id: uid, x: p.x, y: p.y, label: p.label ?? b.name });
        owner[uid] = b.id;
      }
    }
    return { pins, pinToBuilding: owner };
  }, []);
}

const fmt = (s: string) => s.replace(/_/g, ' ').toUpperCase();

export default function MapPage() {
  const gsapRef = useRef(ensureGsap());
  const gsap = gsapRef.current;
  const router = useRouter();
  const click = useSoundEffect('/sounds/CLICK.wav');
  const pop   = useSoundEffect('/sounds/POPOPOP.wav');

  const { pins: allPins, pinToBuilding } = useFlattenedPins();

  const [filter, setFilter] = useState<'all' | string>('all');
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [showHint, setShowHint] = useState(true);
  const [hintMounted, setHintMounted] = useState(true);
  const hintRef = useRef<HTMLDivElement | null>(null);

  const filteredPins = useMemo<Pin[]>(() => {
    if (filter === 'all') return allPins;
    return allPins.filter(p => pinToBuilding[p.id] === filter);
  }, [filter, allPins, pinToBuilding]);

  const selectBuilding = (id: 'all' | string) => {
    click();
    setFilter(id);
    if (id === 'all') { setSelectedId(undefined); return; }
    const b = tracks.find(t => t.id === id);
    const first = b?.pins?.[0];
    if (first) setSelectedId(`${id}:${first.id}`);
  };

  const showAllRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<HTMLButtonElement[]>([]);
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    tl.add(() => {
      try {
        const r: any = (pop as any)();
        r?.catch?.(() => {});
      } catch {
      }
    }, 0);

    tl.fromTo(
      showAllRef.current,
      { opacity: 0, y: -8 },
      { opacity: 1, y: 0, duration: 0.35, immediateRender: false },
      0
    );

    itemRefs.current.forEach((el, i) => {
      tl.fromTo(
        el,
        { opacity: 0, y: -10, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.14, immediateRender: false },
        i === 0 ? 0.05 : `+=0.04`
      );
    });

    return () => { tl.kill(); }
  }, []);

  useEffect(() => {
    if(showHint) {
      setHintMounted(true);
      requestAnimationFrame(() => {
        if(!hintRef.current) return;
        gsap.fromTo(
          hintRef.current,
          { autoAlpha: 0},
          { autoAlpha: 1, duration: 0.30, ease: 'power2.out' }
        );
      });
    } else {
      if(!hintRef.current) { setHintMounted(false); return; }
      gsap.to(hintRef.current, {
        autoAlpha: 0,
        duration: 0.22, ease: 'power2.inOut',
        onComplete: () => setHintMounted(false),
      });
    }
  }, [showHint, gsap]);

  const pill = (active: boolean) => [
    'w-full text-center px-4 py-2 rounded-md border text-xl font-staatliches tracking-wide',
    active ? 'bg-[#75290E] text-white border-transparent'
           : 'bg-white text-[#75290E] border-black/20 hover:bg-[#75290E] hover:text-white'
  ].join(' ');

  return (
    <PageWrapper>
      <div className="relative w-full h-full">
        <aside className="absolute top-0 right-0 h-full w-[26%] bg-black text-white z-10">
          <div className="absolute inset-3 border border-white/40 pointer-events-none" />
          <div className="relative p-6 h-full flex flex-col">

            <div className="mt-4 space-y-3 overflow-y-auto custom-scroll pr-1 flex-1">
              <button
                ref={showAllRef}
                onClick={() => selectBuilding('all')}
                className={pill(filter === 'all')}
              >
                SHOW ALL BUILDINGS
              </button>

              {tracks.map((b, i) => (
                <button
                  key={b.id}
                  ref={el => { if (el) itemRefs.current[i] = el; }}
                  onClick={() => selectBuilding(b.id)}
                  className={
                    pill(filter === b.id) + ' opacity-0 translate-y-2 scale-[0.98] will-change-transform'
                  }
                >
                  {fmt(b.name)}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="absolute inset-0" style={{ right: '26%' }}>
          {hintMounted && (
            <div
              ref={hintRef}
              className="absolute bottom-8 right-8 z-1000"
            >
              <div
                className="
                  flex items-center gap-3 rounded-xl border border-black/50 shadow-[0_10px_28px_rgba(0,0,0,0.35)] px-5 py-3 text-white bg-[#75290E]"
              >
                <img
                  src="/images/home/TwofingerDrag.png"
                  alt=""
                  className="h-9 w-9 shrink-0 select-none pointer-events-none"
                  draggable={false}
                />
                <div className="leading-tight font-lexendDeca">
                  <div>Two-finger drag</div>
                  <div>to move the map</div>
                </div>
              </div>
            </div>
          )}
          <div className="absolute top-8 left-10 z-20">
            <img
              src="/images/home/TheHistoricBuildingsofDalhart_Logo.png"
              alt="The Historic Buildings of Dalhart"
              className="h-20 w-auto pointer-events-none select-none"
            />
          </div>
          <MapCanvas
            mapSrc="/images/home/Dalhart_BaseMap.jpg"
            pins={filteredPins}
            selectedId={selectedId}
            onSelectPin={setSelectedId}
            showArrows={true}
            initialScaleMul={3.0}
            onExplore={(pinUid) => {
              const b = pinToBuilding[pinUid]; if (!b) return;
              click(); router.push(`/location/${b}`);
            }}
            fitMode='width'
            onHome={() => { router.push('/'); }}
            onUserPin={() => setShowHint(false)}
          />
        </div>
      </div>
    </PageWrapper>
  );
}
