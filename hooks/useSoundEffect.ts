import { useEffect, useRef } from 'react';

export function useSoundEffect(src: string, poolSize = 3) {
  const poolRef = useRef<HTMLAudioElement[]>([]);
  const unlockedRef = useRef(false);

  useEffect(() => {
    const pool: HTMLAudioElement[] = Array.from({ length: poolSize }, () => {
      const a = new Audio(src);
      a.preload = 'auto';
      a.load();
      return a;
    });
    poolRef.current = pool;

    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      poolRef.current.forEach(a => {
        a.play().then(() => {
          a.pause();
          a.currentTime = 0;
        }).catch(() => {
        });
      });
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock,   { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      poolRef.current.forEach(a => { a.src = ''; a.load(); });
      poolRef.current = [];
      unlockedRef.current = false;
    };
  }, [src, poolSize]);

  const play = () => {
    const pool = poolRef.current;
    if (!pool.length) return;

    let el = pool.find(a => a.paused || a.ended);
    if (!el) {
      const clone = pool[0].cloneNode() as HTMLAudioElement;
      clone.src = pool[0].src;
      pool.push(clone);
      el = clone;
    }

    try {
      el.currentTime = 0;
      void el.play().catch(() => {});
    } catch {
    }
  };

  return play;
}
