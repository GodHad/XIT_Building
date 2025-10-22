'use client';
import PageWrapper from "@/components/PageWrapper";
import MapCanvas from "@/components/map/MapCanvas";
import Sidebar from "@/components/location/Sidebar";
import { tracks } from "@/data/buildings";
import { useMemo, useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ensureGsap } from "@/utils/gsapClient";
import { useSoundEffect } from "@/hooks/useSoundEffect";

export default function LocationPage() {
  const gsapRef = useRef(ensureGsap());
  const gsap = gsapRef.current;

  const router = useRouter();
  const { building } = useParams<{ building: string }>();
  const playClick = useSoundEffect('/sounds/CLICK.mp3');

  const track = useMemo(
    () => tracks.find(t => t.id === building) ?? tracks[0],
    [building]
  );

  const borderRef = useRef<HTMLDivElement | null>(null);
  const logoRef   = useRef<HTMLImageElement | null>(null);
  const mapBtnRef = useRef<HTMLButtonElement | null>(null);
  const asideRef  = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.fromTo(
      borderRef.current,
      { xPercent: 110, opacity: 0 },
      { xPercent: 0,  opacity: 1, duration: 0.45, force3D: true }
    )
    .fromTo(
      [logoRef.current, mapBtnRef.current],
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.25, stagger: 0.06, immediateRender: false },
      "-=0.15"
    )

    return () => { tl.kill(); }
  }, []);

  const [index, setIndex] = useState(0);
  const [activePin, setActivePin] = useState<string | undefined>(track.startPinId);

  const exitToMap = () => {
    playClick();
    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    tl.to(asideRef.current, { autoAlpha: 0, y: 6, duration: 0.22 }, 0)
      .to([logoRef.current, mapBtnRef.current], { autoAlpha: 0, duration: 0.18 }, 0)
      .to(borderRef.current, { xPercent: 110, duration: 0.28 }, 0.02)
      .add(() => router.push('/map'));
  };

  return (
    <PageWrapper>
      <div className="relative w-full h-full grid grid-cols-[1fr_minmax(520px,34%)]">
        <div className="relative">
          <div
            ref={borderRef}
            className="pointer-events-none absolute inset-12 right-0 border-[6px] border-[#75290E] border-r-0 rounded-bl-[45px] z-10"
          />

          <img
            ref={logoRef}
            src="/images/home/TheHistoricBuildingsofDalhart_Logo.png"
            alt="The Historic Buildings of Dalhart"
            className="absolute z-20 top-8 left-10 h-20 w-auto select-none pointer-events-none"
          />

          <button
            ref={mapBtnRef}
            onClick={exitToMap}
            className="absolute z-20 left-18 bottom-18 cursor-pointer"
            aria-label="Open map"
            title="Open map"
          >
            <img src="/images/home/MapButton.png" className="h-14 w-14" alt="" />
          </button>

          <MapCanvas
            mapSrc={track.mapRef}
            pins={track.pins.map(p => ({ ...p, id: p.id }))}
            selectedId={activePin}
            onSelectPin={setActivePin}
            showControls={false}
            initialScaleMul={6.0}
            minScaleMul={0.35}
          />
        </div>

        <div ref={asideRef} className="h-full min-h-0 overflow-hidden">
          <Sidebar
            slides={track.slides}
            index={index}
            setIndex={setIndex}
            onPinChange={(pinId) => { if (pinId) setActivePin(pinId); }}
            buildingName={track.name}
          />
        </div>
      </div>
    </PageWrapper>
  );
}
