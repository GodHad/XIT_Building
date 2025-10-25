'use client';
import { useCallback } from 'react';
import { playFx } from '@/utils/audioEngine';

const META: Record<string, { id: string; group: string; vol: number }> = {
  'CLICK':   { id: 'click',   group: 'ui',   vol: 0.8 },
  'FLIP':    { id: 'flip',    group: 'ui',   vol: 0.9 },
  'WHOOSH':  { id: 'whoosh',  group: 'move', vol: 0.75 },
  'TOOLTIP': { id: 'tooltip', group: 'ui',   vol: 0.6 },
  'POPOPOP': { id: 'pop',     group: 'ui',   vol: 0.85 },
};

export function useSoundEffect(urlOrId: string) {
  const base = urlOrId.split('/').pop() || urlOrId;
  const name = (base.split('.')[0] || base).toUpperCase();
  const meta = META[name] ?? META['CLICK'];

  return useCallback(() => {
    playFx(meta.id, { exclusiveKey: meta.group, volume: meta.vol });
  }, [meta]);
}
