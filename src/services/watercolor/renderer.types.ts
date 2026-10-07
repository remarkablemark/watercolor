import type { RenderBackend, WatercolorParams } from 'src/types/watercolor';

/** Anything that can paint a rendered frame into a canvas. */
export interface WatercolorRenderer {
  readonly backend: RenderBackend;
  render(source: ImageData, params: WatercolorParams): void;
  dispose(): void;
}

/** Injectable canvas context lookup used to keep the renderer testable. */
export type ContextFactory = (
  canvas: HTMLCanvasElement,
  contextId: string,
) => unknown;

/** When to prefer the GPU path over the CPU path. */
export type RendererPreference = 'auto' | 'canvas2d';

export interface RendererOptions {
  prefer?: RendererPreference;
  getContext?: ContextFactory;
}
