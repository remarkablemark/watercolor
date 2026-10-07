import type { DownloadFormat } from 'src/types/watercolor';

/** Formats offered in the download control, in menu order. */
export const DOWNLOAD_FORMATS: readonly DownloadFormat[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
];

const EXTENSIONS: Record<DownloadFormat, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/** Quality passed to `toBlob` for lossy formats. */
export const DEFAULT_QUALITY = 0.92;

/**
 * Picks the download format matching the source mime type, falling back
 * to PNG for inputs with no encodable format (gif, avif, clipboard).
 */
export function resolveDownloadFormat(mimeType: string): DownloadFormat {
  return DOWNLOAD_FORMATS.find((format) => format === mimeType) ?? 'image/png';
}

/** File extension for a format, without the dot. */
export function extensionFor(format: DownloadFormat): string {
  return EXTENSIONS[format];
}

/** Probes whether the browser can encode the given format via canvas. */
export function supportsEncoding(format: DownloadFormat): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL(format).startsWith(`data:${format}`);
}

/**
 * Builds the output filename by appending `-watercolor` to the input's
 * base name, keeping the base name when the input has no usable stem.
 */
export function downloadFilename(
  sourceName: string,
  format: DownloadFormat,
): string {
  const base = sourceName.replace(/\.[^.]*$/, '') || 'watercolor';
  return `${base}-watercolor.${extensionFor(format)}`;
}

/** Encodes a canvas as a blob in the requested format. */
export function encodeImage(
  canvas: HTMLCanvasElement,
  format: DownloadFormat,
  quality: number = DEFAULT_QUALITY,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Image encoding failed'));
        }
      },
      format,
      quality,
    );
  });
}

/** Triggers a browser download for an in-memory blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
