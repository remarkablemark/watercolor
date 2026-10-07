import { fireEvent, render, screen } from '@testing-library/react';
import { PRESETS } from 'src/services/watercolor/presets';

import { PresetPicker } from '.';

describe('PresetPicker', () => {
  it('renders every preset', () => {
    render(<PresetPicker activeId={null} onSelect={vi.fn()} />);

    for (const preset of PRESETS) {
      expect(
        screen.getByRole('button', { name: preset.label }),
      ).toBeInTheDocument();
    }
  });

  it('marks only the active preset', () => {
    render(<PresetPicker activeId="loose" onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Loose' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Sketch' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('emits the selected preset id', () => {
    const onSelect = vi.fn();
    render(<PresetPicker activeId="loose" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Wet-on-wet' }));

    expect(onSelect).toHaveBeenCalledWith('wet');
  });
});
