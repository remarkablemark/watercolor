import { loadImage } from './image';

describe('loadImage', () => {
  it('resolves with the element once loaded', async () => {
    class LoadedImage {
      private listeners: Record<string, () => void> = {};

      set src(_value: string) {
        queueMicrotask(() => {
          this.listeners.load();
        });
      }

      addEventListener(type: string, listener: () => void): void {
        this.listeners[type] = listener;
      }
    }
    vi.stubGlobal('Image', LoadedImage);
    const image = await loadImage('blob:example');
    expect(image).toBeInstanceOf(LoadedImage);
    vi.unstubAllGlobals();
  });

  it('rejects when the browser cannot decode the resource', async () => {
    class BrokenImage {
      private listeners: Record<string, () => void> = {};

      set src(_value: string) {
        queueMicrotask(() => {
          this.listeners.error();
        });
      }

      addEventListener(type: string, listener: () => void): void {
        this.listeners[type] = listener;
      }
    }
    vi.stubGlobal('Image', BrokenImage);
    await expect(loadImage('blob:broken')).rejects.toThrow(
      'Unable to decode image',
    );
    vi.unstubAllGlobals();
  });
});
