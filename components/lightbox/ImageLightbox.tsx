'use client';
import LightboxShell from './LightboxShell';

export default function ImageLightbox({
  src,
  caption,
  onClose,
}: {
  src: string;
  caption?: string;
  onClose: () => void;
}) {
  return (
    <LightboxShell onClose={onClose}>
      <div className="flex-1 min-h-0 text-white grid place-items-center px-6 my-6">
        <figure className="inline-block max-w-[min(1100px,calc(100vw-10rem))] p-5">
          <img
            src={src}
            alt=""
            className="block w-full max-w-full object-contain mb-5"
          />

          {caption && (
            <figcaption className="mt-3 w-full text-center text-lg font-lexendDeca leading-snug opacity-90">
              {caption}
            </figcaption>
          )}
        </figure>
      </div>
    </LightboxShell>
  );
}
