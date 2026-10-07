/**
 * Decodes an image URL into an `HTMLImageElement`. Rejects when the
 * browser cannot decode the resource.
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener(
      'load',
      () => {
        resolve(image);
      },
      { once: true },
    );
    image.addEventListener(
      'error',
      () => {
        reject(new Error('Unable to decode image'));
      },
      {
        once: true,
      },
    );
    image.src = url;
  });
}
