import type { KeyboardEvent, PointerEvent, RefObject } from 'react';
import { useState } from 'react';

interface CompareViewProps {
  originalUrl: string;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  width: number;
  height: number;
  alt: string;
}

const STEP = 2;

/**
 * Side-by-side reveal: the rendered canvas fills the frame and the
 * original image is clipped over it. Drag anywhere (or use the arrow
 * keys on the handle) to move the divider.
 */
export function CompareView({
  originalUrl,
  canvasRef,
  width,
  height,
  alt,
}: CompareViewProps) {
  const [divider, setDivider] = useState(50);

  const update = (event: PointerEvent<HTMLDivElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) {
      return;
    }
    const next = ((event.clientX - rect.left) / rect.width) * 100;
    setDivider(Math.max(0, Math.min(100, next)));
  };

  const nudge = (event: KeyboardEvent<HTMLDivElement>): void => {
    let next: number | null = null;
    if (event.key === 'ArrowLeft') {
      next = divider - STEP;
    } else if (event.key === 'ArrowRight') {
      next = divider + STEP;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = 100;
    }
    if (next === null) {
      return;
    }
    event.preventDefault();
    setDivider(Math.max(0, Math.min(100, next)));
  };

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-stone-200 bg-stone-100 select-none dark:border-stone-800 dark:bg-stone-900"
      style={{ aspectRatio: `${String(width)} / ${String(height)}` }}
      onPointerDown={update}
      onPointerMove={(event) => {
        if (event.buttons === 1) {
          update(event);
        }
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <img
        src={originalUrl}
        alt={alt}
        draggable={false}
        className="absolute inset-0 h-full w-full"
        style={{ clipPath: `inset(0 ${String(100 - divider)}% 0 0)` }}
      />
      <span className="pointer-events-none absolute top-2 left-2 rounded bg-black/50 px-1.5 py-0.5 text-sm text-white">
        Original
      </span>
      <span className="pointer-events-none absolute top-2 right-2 rounded bg-black/50 px-1.5 py-0.5 text-sm text-white">
        Watercolor
      </span>
      <div
        role="slider"
        aria-label="Before and after position"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(divider)}
        tabIndex={0}
        onKeyDown={nudge}
        style={{ left: `${String(divider)}%` }}
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full border border-stone-900/20 bg-white p-2 shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
      >
        <span
          aria-hidden="true"
          className="block h-4 w-4 leading-none text-stone-700"
        >
          ↔
        </span>
      </div>
    </div>
  );
}
