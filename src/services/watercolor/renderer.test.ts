import { DEFAULT_PARAMS } from './params';
import { createWatercolorRenderer, probeWebgl } from './renderer';
import { createFakeGl } from './webgl/fakeGl';

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
  it('prefers webgl when a context is available', () => {
    const canvas = { width: 0, height: 0 } as HTMLCanvasElement;
    const gl = createFakeGl();
    const getContext: ContextFactory = (_canvas, id) =>
      id === 'webgl2' ? gl : makeContext(canvas);

    const renderer = createWatercolorRenderer(canvas, { getContext });

    expect(renderer.backend).toBe('webgl');
    renderer.dispose();
  });

  it('falls back to the cpu path when webgl2 is unavailable', () => {
    const canvas = { width: 0, height: 0 } as HTMLCanvasElement;
    const context = makeContext(canvas);
    const getContext: ContextFactory = (_canvas, id) =>
      id === '2d' ? context : null;

    const renderer = createWatercolorRenderer(canvas, { getContext });

    expect(renderer.backend).toBe('canvas2d');
    renderer.render(new ImageData(4, 3), DEFAULT_PARAMS);
    expect(canvas.width).toBe(4);
    expect(canvas.height).toBe(3);
    expect(context.putImageData).toHaveBeenCalledTimes(1);
    renderer.dispose();
  });

  it('skips the gpu probe when the cpu path is forced', () => {
    const canvas = { width: 0, height: 0 } as HTMLCanvasElement;
    const context = makeContext(canvas);
    const getContext = vi.fn((_canvas: HTMLCanvasElement, id: string) =>
      id === '2d' ? context : null,
    );

    const renderer = createWatercolorRenderer(canvas, {
      prefer: 'canvas2d',
      getContext,
    });

    expect(renderer.backend).toBe('canvas2d');
    expect(getContext).toHaveBeenCalledTimes(1);
    expect(getContext).toHaveBeenCalledWith(canvas, '2d');
  });

  it('falls back to the cpu path when the gpu path fails to start', () => {
    const canvas = { width: 0, height: 0 } as HTMLCanvasElement;
    const context = makeContext(canvas);
    const brokenGl = createFakeGl({ getShaderParameter: false });
    const getContext: ContextFactory = (_canvas, id) =>
      id === 'webgl2' ? brokenGl : context;

    const renderer = createWatercolorRenderer(canvas, { getContext });

    expect(renderer.backend).toBe('canvas2d');
  });

  it('throws when no context can be created', () => {
    const canvas = { width: 0, height: 0 } as HTMLCanvasElement;
    expect(() =>
      createWatercolorRenderer(canvas, { getContext: () => null }),
    ).toThrow('Canvas 2D context is unavailable');
  });
});

describe('probeWebgl', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports no support without a webgl2 context', () => {
    expect(probeWebgl()).toEqual({ supported: false, maxTextureSize: 0 });
  });

  it('reports support with the texture size limit', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      createFakeGl({ getParameter: 4096 }),
    );
    expect(probeWebgl()).toEqual({ supported: true, maxTextureSize: 4096 });
  });

  it('releases the probe context when the extension exists', () => {
    const loseContext = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      createFakeGl({
        getParameter: 4096,
        getExtension: { loseContext },
      }),
    );
    expect(probeWebgl().supported).toBe(true);
    expect(loseContext).toHaveBeenCalledTimes(1);
  });

  it('reports no support when the texture limit is zero', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      createFakeGl({ getParameter: 0 }),
    );
    expect(probeWebgl()).toEqual({ supported: false, maxTextureSize: 0 });
  });

  it('reports no support when probing throws', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => {
        throw new Error('blocked');
      },
    );
    expect(probeWebgl()).toEqual({ supported: false, maxTextureSize: 0 });
  });
});
