'use client';

import gsap from 'gsap';
import { Draggable as DraggablePlugin } from 'gsap/Draggable';

let registered = false;

export function ensureGsap() {
  if (!registered) {
    gsap.registerPlugin(DraggablePlugin);
    registered = true;
  }
  return gsap;
}

export const Draggable = DraggablePlugin;

export default gsap;
