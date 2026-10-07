import { act, renderHook } from '@testing-library/react';
import { loadImage } from 'src/services/image';
import type { MockInstance } from 'vitest';

import { useImageFile } from './useImageFile';

vi.mock('src/services/image', () => ({ loadImage: vi.fn() }));

function fakeImage(width = 640, height = 480): HTMLImageElement {
  const element = document.createElement('img');
  Object.defineProperty(element, 'naturalWidth', { value: width });
  Object.defineProperty(element, 'naturalHeight', { value: height });
  return element;
}

function imageFile(name = 'photo.jpg', type = 'image/jpeg'): File {
  return new File(['image-bytes'], name, { type });
}

function pasteEvent(payload: Record<string, unknown>): Event {
  const event = new Event('paste', { bubbles: true });
  Object.defineProperty(event, 'clipboardData', { value: payload });
  return event;
}

/** Runs `action` inside `act`, waiting for the load promise chain. */
async function actLoad(action: () => void): Promise<void> {
  await act(async () => {
    action();
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
}

describe('useImageFile', () => {
  let counter = 0;
  let createObjectURL: MockInstance<(obj: Blob | MediaSource) => string>;
  let revokeObjectURL: MockInstance<(url: string) => void>;

  beforeEach(() => {
    counter = 0;
    createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => `blob:image-${String(++counter)}`);
    revokeObjectURL = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);
    vi.mocked(loadImage).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts empty', () => {
    const { result } = renderHook(() => useImageFile());
    expect(result.current.image).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('loads a supported file', async () => {
    vi.mocked(loadImage).mockResolvedValue(fakeImage());
    const { result } = renderHook(() => useImageFile());

    await actLoad(() => {
      result.current.loadFile(imageFile('beach.png', 'image/png'));
    });

    expect(result.current.image).toMatchObject({
      name: 'beach.png',
      type: 'image/png',
      width: 640,
      height: 480,
      url: 'blob:image-1',
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('rejects unsupported file types without decoding', () => {
    const { result } = renderHook(() => useImageFile());

    act(() => {
      result.current.loadFile(
        new File(['text'], 'notes.txt', { type: 'text/plain' }),
      );
    });

    expect(result.current.error).toBe('Unsupported file type: text/plain');
    expect(result.current.image).toBeNull();
    expect(loadImage).not.toHaveBeenCalled();
  });

  it('surfaces decode failures and revokes the object url', async () => {
    vi.mocked(loadImage).mockRejectedValue(new Error('Unable to decode image'));
    const { result } = renderHook(() => useImageFile());

    await actLoad(() => {
      result.current.loadFile(imageFile());
    });

    expect(result.current.error).toBe('Unable to decode image');
    expect(result.current.image).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:image-1');
  });

  it('ignores a stale load that finishes after a newer one', async () => {
    let resolveFirst: ((element: HTMLImageElement) => void) | undefined;
    vi.mocked(loadImage)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(fakeImage(100, 80));
    const { result } = renderHook(() => useImageFile());

    await actLoad(() => {
      result.current.loadFile(imageFile('first.jpg'));
      result.current.loadFile(imageFile('second.jpg', 'image/png'));
    });
    expect(result.current.image?.name).toBe('second.jpg');

    await actLoad(() => {
      resolveFirst?.(fakeImage(1, 1));
    });

    expect(result.current.image?.name).toBe('second.jpg');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:image-1');
  });

  it('revokes the previous url when the image is replaced', async () => {
    vi.mocked(loadImage).mockResolvedValue(fakeImage());
    const { result } = renderHook(() => useImageFile());

    await actLoad(() => {
      result.current.loadFile(imageFile('first.jpg'));
    });
    await actLoad(() => {
      result.current.loadFile(imageFile('second.jpg', 'image/png'));
    });

    expect(result.current.image?.name).toBe('second.jpg');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:image-1');
  });

  it('falls back to a default name and type for bare files', async () => {
    vi.mocked(loadImage).mockResolvedValue(fakeImage());
    const { result } = renderHook(() => useImageFile());

    await actLoad(() => {
      result.current.loadFile(new File(['x'], ''));
    });

    expect(result.current.image).toMatchObject({
      name: 'image',
      type: 'image/png',
    });
  });

  it('ignores a stale rejection from a superseded load', async () => {
    let rejectFirst: ((reason: unknown) => void) | undefined;
    vi.mocked(loadImage)
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectFirst = reject;
          }),
      )
      .mockResolvedValueOnce(fakeImage(100, 80));
    const { result } = renderHook(() => useImageFile());

    await actLoad(() => {
      result.current.loadFile(imageFile('first.jpg'));
      result.current.loadFile(imageFile('second.jpg', 'image/png'));
    });
    await actLoad(() => {
      rejectFirst?.(new Error('too late'));
    });

    expect(result.current.image?.name).toBe('second.jpg');
    expect(result.current.error).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:image-1');
  });

  it('uses a fallback message when the rejection is not an error', async () => {
    vi.mocked(loadImage).mockRejectedValue('garbage');
    const { result } = renderHook(() => useImageFile());

    await actLoad(() => {
      result.current.loadFile(imageFile());
    });

    expect(result.current.error).toBe('Unable to load image');
    expect(result.current.image).toBeNull();
  });

  it('clears the image and revokes its url', async () => {
    vi.mocked(loadImage).mockResolvedValue(fakeImage());
    const { result } = renderHook(() => useImageFile());

    await actLoad(() => {
      result.current.loadFile(imageFile());
    });
    act(() => {
      result.current.clear();
    });

    expect(result.current.image).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:image-1');
  });

  it('invalidates a pending load when cleared', async () => {
    let resolveLoad: ((element: HTMLImageElement) => void) | undefined;
    vi.mocked(loadImage).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLoad = resolve;
        }),
    );
    const { result } = renderHook(() => useImageFile());

    act(() => {
      result.current.loadFile(imageFile());
    });
    act(() => {
      result.current.clear();
    });
    await actLoad(() => {
      resolveLoad?.(fakeImage());
    });

    expect(result.current.image).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:image-1');
  });

  it('loads images from clipboard files', async () => {
    vi.mocked(loadImage).mockResolvedValue(fakeImage());
    const { result } = renderHook(() => useImageFile());

    await actLoad(() => {
      document.dispatchEvent(
        pasteEvent({ files: [imageFile('pasted.png', 'image/png')] }),
      );
    });

    expect(result.current.image?.name).toBe('pasted.png');
  });

  it('loads images from clipboard items', async () => {
    vi.mocked(loadImage).mockResolvedValue(fakeImage());
    const file = imageFile('item.png', 'image/png');
    const { result } = renderHook(() => useImageFile());

    await actLoad(() => {
      document.dispatchEvent(
        pasteEvent({
          items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }],
        }),
      );
    });

    expect(result.current.image?.name).toBe('item.png');
  });

  it('ignores empty clipboard payloads', () => {
    const { result } = renderHook(() => useImageFile());

    act(() => {
      document.dispatchEvent(pasteEvent({ items: [], files: [] }));
    });

    expect(result.current.image).toBeNull();
    expect(loadImage).not.toHaveBeenCalled();
  });

  it('ignores non-image clipboard content', () => {
    const { result } = renderHook(() => useImageFile());

    act(() => {
      document.dispatchEvent(
        pasteEvent({
          files: [new File(['x'], 'a.txt', { type: 'text/plain' })],
        }),
      );
    });

    expect(result.current.image).toBeNull();
    expect(loadImage).not.toHaveBeenCalled();
  });

  it('revokes the object url on unmount', async () => {
    vi.mocked(loadImage).mockResolvedValue(fakeImage());
    const { result, unmount } = renderHook(() => useImageFile());

    await actLoad(() => {
      result.current.loadFile(imageFile());
    });
    unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:image-1');
  });
});
