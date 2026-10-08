import type { ChangeEvent, DragEvent } from 'react';
import { useId, useState } from 'react';

interface DropzoneProps {
  onFile: (file: File) => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'hero' | 'button';
}

/**
 * Drag-and-drop upload target with a hidden file input. Also accepts
 * clipboard paste through the app-level paste listener.
 */
export function Dropzone({
  onFile,
  loading = false,
  disabled = false,
  variant = 'hero',
}: DropzoneProps) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const hero = variant === 'hero';
  const inactive = disabled || loading;

  const accept = (file: File | null | undefined): void => {
    if (file) {
      onFile(file);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    if (inactive) {
      return;
    }
    accept(event.dataTransfer.files[0]);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    accept(event.target.files?.[0]);
  };

  const zoneClass = [
    'border-2 border-dashed',
    hero
      ? 'flex min-h-64 flex-col items-center justify-center gap-4 rounded-2xl p-10 text-center'
      : 'inline-flex items-center rounded-lg px-3 py-2',
    dragging
      ? 'border-sky-500 bg-sky-50 dark:border-sky-400 dark:bg-sky-950'
      : 'border-stone-300 dark:border-stone-700',
  ].join(' ');

  return (
    <div
      className={zoneClass}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {hero && (
        <p className="max-w-sm text-base text-stone-500 dark:text-stone-400">
          Drop an image, paste from the clipboard, or browse
        </p>
      )}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="peer sr-only"
        disabled={inactive}
        onChange={handleChange}
      />
      <label
        htmlFor={inputId}
        className="cursor-pointer rounded-md bg-stone-900 px-4 py-2 text-base font-medium text-white shadow-xs peer-focus-visible:ring-2 peer-focus-visible:ring-sky-500 hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
      >
        {loading ? 'Loading…' : hero ? 'Browse files' : 'Choose another image'}
      </label>
    </div>
  );
}
