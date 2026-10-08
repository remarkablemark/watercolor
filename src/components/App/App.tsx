import { useState } from 'react';
import { CompareView } from 'src/components/CompareView';
import { Controls } from 'src/components/Controls';
import { DownloadBar } from 'src/components/DownloadBar';
import { Dropzone } from 'src/components/Dropzone';
import { PresetPicker } from 'src/components/PresetPicker';
import { useImageFile } from 'src/hooks/useImageFile';
import { useWatercolor } from 'src/hooks/useWatercolor';
import {
  DOWNLOAD_FORMATS,
  resolveDownloadFormat,
  supportsEncoding,
} from 'src/services/download';
import { MAX_INPUT_PIXELS } from 'src/services/watercolor/geometry';
import { DEFAULT_PARAMS } from 'src/services/watercolor/params';
import { getPreset, matchPreset } from 'src/services/watercolor/presets';
import type { PresetId, WatercolorParams } from 'src/types/watercolor';

export function App() {
  const { image, error: imageError, loading, loadFile, clear } = useImageFile();
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [presetId, setPresetId] = useState<PresetId | null>(() =>
    matchPreset(DEFAULT_PARAMS),
  );
  const {
    canvasRef,
    status,
    error: renderError,
  } = useWatercolor(image, params);

  const formats = DOWNLOAD_FORMATS.filter(supportsEncoding);
  const oversized =
    image !== null && image.width * image.height > MAX_INPUT_PIXELS;

  const handleParams = (next: WatercolorParams): void => {
    setParams(next);
    setPresetId(matchPreset(next));
  };

  const handlePreset = (id: PresetId): void => {
    setParams(getPreset(id).params);
    setPresetId(id);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <header className="border-b border-stone-200 bg-white/70 py-3 dark:border-stone-800 dark:bg-stone-900/70">
        <div className="mx-auto flex max-w-6xl items-baseline justify-between gap-4 px-4 sm:px-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Watercolor
            </h1>
            <p className="text-base text-stone-500 dark:text-stone-400">
              Turn any image into a watercolor painting
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {imageError && (
          <p
            role="alert"
            className="mb-4 rounded-md bg-red-50 px-3 py-2 text-base text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {imageError}
          </p>
        )}

        {!image ? (
          <Dropzone onFile={loadFile} loading={loading} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <section className="space-y-3">
              <CompareView
                originalUrl={image.url}
                canvasRef={canvasRef}
                width={image.width}
                height={image.height}
                alt={`Original ${image.name}`}
                rendering={status === 'rendering'}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-base text-red-700 dark:text-red-300">
                  {renderError}
                </p>
                <Dropzone variant="button" onFile={loadFile} />
              </div>
              {oversized && (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Large image — the full render is capped at 24 megapixels.
                </p>
              )}
            </section>
            <aside className="space-y-6">
              <PresetPicker activeId={presetId} onSelect={handlePreset} />
              <Controls params={params} onChange={handleParams} />
              <div className="space-y-2">
                <DownloadBar
                  key={image.url}
                  sourceName={image.name}
                  initialFormat={resolveDownloadFormat(image.type)}
                  formats={formats}
                  canvasRef={canvasRef}
                  disabled={status !== 'idle'}
                />
                <button
                  type="button"
                  onClick={clear}
                  className="text-sm text-stone-500 underline-offset-2 hover:underline dark:text-stone-400"
                >
                  Remove image
                </button>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
