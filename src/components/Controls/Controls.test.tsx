import { fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_PARAMS, PARAM_META } from 'src/services/watercolor/params';

import { Controls } from '.';

describe('Controls', () => {
  it('renders one slider per parameter with its current value', () => {
    render(<Controls params={DEFAULT_PARAMS} onChange={vi.fn()} />);

    const sliders = screen.getAllByRole('slider');
    expect(sliders).toHaveLength(PARAM_META.length);
    for (const meta of PARAM_META) {
      expect(screen.getByLabelText(meta.label)).toBeInTheDocument();
    }
    expect(screen.getByText('1.50')).toBeInTheDocument();
    expect(screen.getByText('32')).toBeInTheDocument();
  });

  it('emits clamped parameters when a slider moves', () => {
    const onChange = vi.fn();
    render(<Controls params={DEFAULT_PARAMS} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Saturation'), {
      target: { value: '9' },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_PARAMS,
      saturation: 2,
    });
  });

  it('emits a fractional value for fine-grained sliders', () => {
    const onChange = vi.fn();
    render(<Controls params={DEFAULT_PARAMS} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Blur'), {
      target: { value: '0.9' },
    });

    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_PARAMS, blur: 0.9 });
  });

  it('resets to the default parameters', () => {
    const onChange = vi.fn();
    render(<Controls params={DEFAULT_PARAMS} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(onChange).toHaveBeenCalledWith(DEFAULT_PARAMS);
  });
});
