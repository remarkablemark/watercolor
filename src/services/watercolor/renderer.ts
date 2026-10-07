import type { WatercolorParams } from 'src/types/watercolor';

import { renderWatercolor } from './pipeline';
import type {
  ContextFactory,
  RendererOptions,
  WatercolorRenderer,
} from './renderer.types';

const defaultContextFactory: ContextFactory = (canvas, contextId) =>
  canvas.getContext(contextId as '2d');

/**
 * Creates the Canvas 2D renderer for a canvas. Throws when the browser
 * denies a 2D context so callers can surface the failure.
 */
export function createWatercolorRenderer(
  canvas: HTMLCanvasElement,
  options: RendererOptions = {},
): WatercolorRenderer {
  const { getContext = defaultContextFactory } = options;
  const context = getContext(canvas, '2d') as CanvasRenderingContext2D | null;
  if (!context) {
    throw new Error('Canvas 2D context is unavailable');
  }
  return {
    render(source: ImageData, params: WatercolorParams): void {
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
