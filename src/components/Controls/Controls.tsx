import { useId } from 'react';
import {
  clampParams,
  DEFAULT_PARAMS,
  PARAM_META,
} from 'src/services/watercolor/params';
import type { WatercolorParams } from 'src/types/watercolor';

interface ControlsProps {
  params: WatercolorParams;
  onChange: (params: WatercolorParams) => void;
}

function formatValue(value: number, step: number): string {
  return step === 1 ? String(Math.round(value)) : value.toFixed(2);
}

/** Slider panel for every effect parameter plus a reset action. */
export function Controls({ params, onChange }: ControlsProps) {
  const idPrefix = useId();

  return (
    <section aria-label="Effect controls" className="space-y-4">
      <h2 className="text-sm font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400">
        Adjust
      </h2>
      {PARAM_META.map((meta) => {
        const inputId = `${idPrefix}-${meta.key}`;
        return (
          <div key={meta.key}>
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor={inputId} className="text-base font-medium">
                {meta.label}
              </label>
              <output
                htmlFor={inputId}
                className="text-sm text-stone-500 tabular-nums dark:text-stone-400"
              >
                {formatValue(params[meta.key], meta.step)}
              </output>
            </div>
            <input
              id={inputId}
              type="range"
              min={meta.min}
              max={meta.max}
              step={meta.step}
              value={params[meta.key]}
              onChange={(event) => {
                onChange(
                  clampParams({
                    ...params,
                    [meta.key]: Number(event.target.value),
                  }),
                );
              }}
              className="w-full accent-sky-600"
            />
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => {
          onChange(DEFAULT_PARAMS);
        }}
        className="rounded-md border border-stone-300 px-3 py-1.5 text-base font-medium hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:border-stone-700 dark:hover:bg-stone-800"
      >
        Reset
      </button>
    </section>
  );
}
