import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import { imageToImageData } from 'src/services/canvas';
import {
  fullPassMaxDim,
  WORKING_MAX_DIM,
} from 'src/services/watercolor/geometry';
import {
  createWatercolorRenderer,
  probeWebgl,
} from 'src/services/watercolor/renderer';
import type { WatercolorRenderer } from 'src/services/watercolor/renderer.types';
import type { RenderBackend, WatercolorParams } from 'src/types/watercolor';

import type { SourceImage } from './useImageFile';

export type RenderStatus = 'idle' | 'rendering' | 'error';

/** Delay before the full-resolution pass runs after input settles. */
export const IDLE_DELAY_MS = 150;

export interface UseWatercolorResult {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  status: RenderStatus;
  backend: RenderBackend | null;
  error: string | null;
}

/** Extracts a display message from an unknown thrown value. */
export function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

/**
 * Drives rendering for the preview canvas. Each change renders a fast
 * working-scale frame immediately, then a full-resolution frame once
 * input settles. Prefers the GPU and falls back to the CPU pipeline.
 */
export function useWatercolor(
  image: SourceImage | null,
  params: WatercolorParams,
): UseWatercolorResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<WatercolorRenderer | null>(null);
  const [status, setStatus] = useState<RenderStatus>('idle');
  const [backend, setBackend] = useState<RenderBackend | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) {
      return undefined;
    }
    const probe = probeWebgl();
    const fitsGpu =
      probe.supported &&
      image.width <= probe.maxTextureSize &&
      image.height <= probe.maxTextureSize;
    try {
      const renderer = createWatercolorRenderer(canvas, {
        prefer: fitsGpu ? 'auto' : 'canvas2d',
      });
      rendererRef.current = renderer;
      setBackend(renderer.backend);
    } catch (cause) {
      setStatus('error');
      setError(messageOf(cause, 'Unable to start a renderer'));
    }
    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, [image]);

  useEffect(() => {
    if (!image) {
      return undefined;
    }
    const renderer = rendererRef.current;
    if (!renderer) {
      // Renderer creation failed; the error status is already set.
      return undefined;
    }

    const renderFrame = (maxDim?: number): boolean => {
      try {
        renderer.render(imageToImageData(image.element, maxDim), params);
        return true;
      } catch (cause) {
        setStatus('error');
        setError(messageOf(cause, 'Unable to render the image'));
        return false;
      }
    };

    setStatus('rendering');
    const quick = setTimeout(() => {
      renderFrame(WORKING_MAX_DIM);
    }, 0);
    const settle = setTimeout(() => {
      const maxDim = fullPassMaxDim(image.width, image.height);
      if (renderFrame(maxDim)) {
        setStatus('idle');
        setError(null);
      }
    }, IDLE_DELAY_MS);

    return () => {
      clearTimeout(quick);
      clearTimeout(settle);
    };
  }, [image, params]);

  return { canvasRef, status, backend, error };
}
