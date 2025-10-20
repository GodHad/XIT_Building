'use client';
import React from 'react';
import clsx from 'clsx';

type Props = {
  id?: string;
  x: number;
  y: number;
  selected?: boolean;
  label?: string;
  onClick?: () => void;
  className?: string;
};

export default function MapPin({ id, x, y, selected, label, onClick, className }: Props) {
  return (
    <button
      data-role="pin"
      data-pin-id={id}
      onClick={onClick}
      className={clsx('absolute js-map-pin', className)}
      style={{
        left: x, top: y,
        transform: 'translate(-50%, -100%)',
        transformOrigin: '50% 100%',
        zIndex: selected ? '200' : ''
      }}
      aria-label={label ?? 'Location'}
    >
      <img
        src="/images/home/LocationPin_Icon.png"
        alt=""
        className={clsx(
          'pointer-events-none select-none h-15 w-12 transition-transform duration-150',
          selected ? 'scale-110' : 'scale-100'
        )}
      />
    </button>
  );
}
