import type { WatercolorParams } from 'src/types/watercolor';

import { renderWatercolor } from './pipeline';
import type {
  ContextFactory,
  RendererOptions,
  WatercolorRenderer,
} from './renderer.types';
import { createGlRenderer } from './webgl/glRenderer';

const defaultContextFactory: ContextFactory = (canvas, contextId) =>
  canvas.getContext(contextId as '2d');

function createCanvas2dRenderer(
  context: CanvasRenderingContext2D,
): WatercolorRenderer {
  return {
    backend: 'canvas2d',
    render(source: ImageData, params: WatercolorParams): void {
      const canvas = context.canvas;
      if (canvas.width !== source.width || canvas.height !== source.height) {
        canvas.width = source.width;
        canvas.height = source.height;
      }
      context.putImageData(renderWatercolor(source, params), 0, 0);
    },
    dispose(): void {
      // The 2D context owns no resources beyond the canvas itself.
    },
  };
}

/**
 * Creates the best available renderer for a canvas. Prefers WebGL2 and
 * silently falls back to the CPU pipeline when the GPU path is missing
 * or fails to initialize.
 */
export function createWatercolorRenderer(
  canvas: HTMLCanvasElement,
  options: RendererOptions = {},
): WatercolorRenderer {
  const { prefer = 'auto', getContext = defaultContextFactory } = options;
  if (prefer !== 'canvas2d') {
    const gl = getContext(canvas, 'webgl2');
    if (gl) {
      try {
        return createGlRenderer(canvas, gl as WebGL2RenderingContext);
      } catch {
        // Shader or resource failure: fall through to the CPU path.
      }
    }
  }
  const context = getContext(canvas, '2d') as CanvasRenderingContext2D | null;
  if (!context) {
    throw new Error('Canvas 2D context is unavailable');
  }
  return createCanvas2dRenderer(context);
}

/** Result of probing the browser for a usable WebGL2 implementation. */
export interface WebglProbe {
  supported: boolean;
  maxTextureSize: number;
}

/**
 * Probes WebGL2 support and the maximum texture size once so callers can
 * route oversized images to the CPU path before creating a GL context.
 */
export function probeWebgl(): WebglProbe {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      return { supported: false, maxTextureSize: 0 };
    }
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    const loseContext = gl.getExtension('WEBGL_lose_context') as {
      loseContext(): void;
    } | null;
    loseContext?.loseContext();
    return { supported: maxTextureSize > 0, maxTextureSize };
  } catch {
    return { supported: false, maxTextureSize: 0 };
  }
}
