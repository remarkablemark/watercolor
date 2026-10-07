import { DEFAULT_PARAMS } from './params';
import { createWatercolorRenderer } from './renderer';

type ContextFactory = (canvas: HTMLCanvasElement, contextId: string) => unknown;

/** Test double whose methods are plain mock function properties. */
interface CanvasDouble {
  canvas: HTMLCanvasElement;
  putImageData: ReturnType<typeof vi.fn>;
}

function makeContext(canvas: HTMLCanvasElement): CanvasDouble {
  return {
    canvas,
    putImageData: vi.fn(),
  };
}

describe('createWatercolorRenderer', () => {
  it('renders the pipeline result into the canvas', () => {
    const canvas = { width: 0, height: 0 } as HTMLCanvasElement;
    const context = makeContext(canvas);
    const getContext: ContextFactory = vi.fn((_canvas, id) =>
      id === '2d' ? context : null,
    );

    const renderer = createWatercolorRenderer(canvas, { getContext });

    expect(getContext).toHaveBeenCalledWith(canvas, '2d');
    renderer.render(new ImageData(4, 3), DEFAULT_PARAMS);
    expect(canvas.width).toBe(4);
    expect(canvas.height).toBe(3);
    expect(context.putImageData).toHaveBeenCalledTimes(1);
    renderer.dispose();
  });

  it('keeps the canvas size when the source already matches', () => {
    const canvas = { width: 4, height: 3 } as HTMLCanvasElement;
    const context = makeContext(canvas);
    const getContext = vi.fn(() => context);

    const renderer = createWatercolorRenderer(canvas, { getContext });
    renderer.render(new ImageData(4, 3), DEFAULT_PARAMS);

    expect(canvas.width).toBe(4);
    expect(canvas.height).toBe(3);
    expect(context.putImageData).toHaveBeenCalledTimes(1);
  });

  it('throws when no context can be created', () => {
    const canvas = { width: 0, height: 0 } as HTMLCanvasElement;
    expect(() =>
      createWatercolorRenderer(canvas, { getContext: () => null }),
    ).toThrow('Canvas 2D context is unavailable');
  });
});
