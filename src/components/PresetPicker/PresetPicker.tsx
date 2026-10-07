import { PRESETS } from 'src/services/watercolor/presets';
import type { PresetId } from 'src/types/watercolor';

interface PresetPickerProps {
  activeId: PresetId | null;
  onSelect: (id: PresetId) => void;
}

/** One-click looks. The active preset is marked with `aria-pressed`. */
export function PresetPicker({ activeId, onSelect }: PresetPickerProps) {
  return (
    <section aria-label="Presets" className="space-y-2">
      <h2 className="text-sm font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400">
        Presets
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((preset) => {
          const active = preset.id === activeId;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              title={preset.description}
              onClick={() => {
                onSelect(preset.id);
              }}
              className={
                active
                  ? 'rounded-md bg-sky-600 px-3 py-2 text-base font-medium text-white'
                  : 'rounded-md border border-stone-300 px-3 py-2 text-base font-medium hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800'
              }
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
