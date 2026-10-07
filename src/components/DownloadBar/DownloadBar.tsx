import type { RefObject } from 'react';
import { useId, useState } from 'react';
import {
  downloadBlob,
  downloadFilename,
  encodeImage,
} from 'src/services/download';
import type { DownloadFormat } from 'src/types/watercolor';

interface DownloadBarProps {
  sourceName: string;
  initialFormat: DownloadFormat;
  formats: readonly DownloadFormat[];
  canvasRef: RefObject<HTMLCanvasElement | null>;
  disabled?: boolean;
}

const FORMAT_LABELS: Record<DownloadFormat, string> = {
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
  'image/webp': 'WEBP',
};

/**
 * Format picker plus the button that encodes and downloads the canvas.
 * Format state resets with the component, so callers remount it by
 * changing `key` when the source image changes.
 */
export function DownloadBar({
  sourceName,
  initialFormat,
  formats,
  canvasRef,
  disabled = false,
}: DownloadBarProps) {
  const selectId = useId();
  const [format, setFormat] = useState<DownloadFormat>(initialFormat);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filename = downloadFilename(sourceName, format);

  const handleDownload = async (): Promise<void> => {
    const canvas = canvasRef.current;
    if (!canvas || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const blob = await encodeImage(canvas, format);
      downloadBlob(blob, filename);
      setBusy(false);
    } catch (cause) {
      setBusy(false);
      setError(cause instanceof Error ? cause.message : 'Download failed');
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-32 flex-1">
        <label
          htmlFor={selectId}
          className="block text-sm font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400"
        >
          Format
        </label>
        <select
          id={selectId}
          value={format}
          onChange={(event) => {
            setFormat(event.target.value as DownloadFormat);
          }}
          className="mt-1 w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-base dark:border-stone-700 dark:bg-stone-900"
        >
          {formats.map((item) => (
            <option key={item} value={item}>
              {FORMAT_LABELS[item]}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={() => {
          void handleDownload();
        }}
        disabled={disabled || busy}
        className="rounded-md bg-sky-600 px-4 py-2 text-base font-medium text-white hover:bg-sky-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:pointer-events-none disabled:opacity-50"
      >
        {busy ? 'Preparing…' : 'Download'}
      </button>
      {error && (
        <p role="alert" className="w-full text-base text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
