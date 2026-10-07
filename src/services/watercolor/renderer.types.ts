import type { WatercolorParams } from 'src/types/watercolor';

/** Anything that can paint a rendered frame into a canvas. */
export interface WatercolorRenderer {
  render(source: ImageData, params: WatercolorParams): void;
  dispose(): void;
}

/** Injectable canvas context lookup used to keep the renderer testable. */
export type ContextFactory = (
  canvas: HTMLCanvasElement,
  contextId: string,
) => unknown;

export interface RendererOptions {
  getContext?: ContextFactory;
}
