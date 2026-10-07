import { act, renderHook } from '@testing-library/react';
import { imageToImageData } from 'src/services/canvas';
import { WORKING_MAX_DIM } from 'src/services/watercolor/geometry';
import { DEFAULT_PARAMS } from 'src/services/watercolor/params';
import type { WatercolorParams } from 'src/types/watercolor';

import type { SourceImage } from './useImageFile';
import { IDLE_DELAY_MS, messageOf, useWatercolor } from './useWatercolor';

vi.mock('src/services/canvas', async (importOriginal) => {
  const actual = await importOriginal<typeof import('src/services/canvas')>();
  return { ...actual, imageToImageData: vi.fn(actual.imageToImageData) };
});

function makeImage(width = 8, height = 6): SourceImage {
  const element = document.createElement('img');
  Object.defineProperty(element, 'naturalWidth', { value: width });
  Object.defineProperty(element, 'naturalHeight', { value: height });
  return {
    element,
    name: 'photo.png',
    type: 'image/png',
    width,
    height,
    url: 'blob:a',
  };
}

interface HookProps {
  image: SourceImage | null;
  params: WatercolorParams;
}

interface PutImageSpy {
  putImageData: ReturnType<typeof vi.fn>;
}

/** Waits inside `act` so timer-driven state updates stay wrapped. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, IDLE_DELAY_MS + 20);
    });
  });
}

function renderWithCanvas(initialProps: HookProps) {
  const { result, rerender } = renderHook(
    ({ image, params }: HookProps) => useWatercolor(image, params),
    { initialProps },
  );
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  act(() => {
    result.current.canvasRef.current = canvas;
  });
  const context = canvas.getContext('2d') as unknown as PutImageSpy;
  vi.spyOn(context, 'putImageData');
  return { result, rerender, canvas, context };
}

function setup() {
  const hooks = renderWithCanvas({ image: null, params: DEFAULT_PARAMS });
  const image = makeImage();
  hooks.rerender({ image, params: DEFAULT_PARAMS });
  return { ...hooks, image };
}

describe('messageOf', () => {
  it('uses the message of real errors', () => {
    expect(messageOf(new Error('boom'), 'fallback')).toBe('boom');
  });

  it('uses the fallback for other thrown values', () => {
    expect(messageOf('nope', 'fallback')).toBe('fallback');
  });
});

describe('useWatercolor', () => {
  afterEach(async () => {
    vi.clearAllMocks();
    const canvas = await vi.importActual<typeof import('src/services/canvas')>(
      'src/services/canvas',
    );
    vi.mocked(imageToImageData).mockImplementation(canvas.imageToImageData);
    document.body.innerHTML = '';
  });

  it('stays idle without an image', () => {
    const { result } = renderHook(() => useWatercolor(null, DEFAULT_PARAMS));
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('renders a fast frame, then a full-resolution frame', async () => {
    const { result, context } = setup();

    expect(result.current.status).toBe('rendering');

    await settle();

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(context.putImageData).toHaveBeenCalledTimes(2);
    expect(vi.mocked(imageToImageData).mock.calls[0][1]).toBe(WORKING_MAX_DIM);
    expect(vi.mocked(imageToImageData).mock.calls[1][1]).toBeUndefined();
  });

  it('renders again when parameters change', async () => {
    const { result, rerender, image, context } = setup();
    await settle();
    expect(context.putImageData).toHaveBeenCalledTimes(2);

    rerender({ image, params: { ...DEFAULT_PARAMS, blur: 0.2 } });

    expect(result.current.status).toBe('rendering');
    await settle();
    expect(context.putImageData).toHaveBeenCalledTimes(4);
    expect(result.current.status).toBe('idle');
  });

  it('reports an error when rendering throws', async () => {
    vi.mocked(imageToImageData).mockImplementation(() => {
      throw new Error('boom');
    });
    const { result } = setup();

    await settle();

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('boom');
  });

  it('reports an error when no context can be created', async () => {
    const { result, rerender, canvas } = renderWithCanvas({
      image: null,
      params: DEFAULT_PARAMS,
    });
    vi.spyOn(canvas, 'getContext').mockReturnValue(null);

    rerender({ image: makeImage(), params: DEFAULT_PARAMS });
    await settle();

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Canvas 2D context is unavailable');
  });
});
