import { fireEvent, render, screen } from '@testing-library/react';

import { CompareView } from '.';

function frame(): HTMLElement {
  const parent = screen.getByRole('slider').parentElement;
  if (parent === null) {
    throw new Error('slider must live inside the compare frame');
  }
  return parent;
}

function mockRect(width: number, left = 0): void {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left,
    right: left + width,
    top: 0,
    bottom: 100,
    width,
    height: 100,
    x: left,
    y: 0,
    toJSON: () => ({}),
  });
}

function renderView() {
  return render(
    <CompareView
      originalUrl="blob:original"
      canvasRef={{ current: null }}
      width={8}
      height={6}
      alt="Original photo.png"
    />,
  );
}

describe('CompareView', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the original clipped to the left half of the frame', () => {
    renderView();

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '50');
    expect(slider).toHaveAttribute('tabindex', '0');
    const image = screen.getByRole('img', { name: 'Original photo.png' });
    expect(image.style.clipPath).toContain('50%');
    expect(screen.getByText('Original')).toBeInTheDocument();
    expect(screen.getByText('Watercolor')).toBeInTheDocument();
    expect(frame().querySelector('canvas')).toBeInTheDocument();
    expect(frame().style.aspectRatio).toBe('8 / 6');
  });

  it('jumps to the pointer position on press and drags while held', () => {
    renderView();
    mockRect(200);
    const slider = screen.getByRole('slider');

    fireEvent.pointerDown(frame(), { clientX: 50 });
    expect(slider).toHaveAttribute('aria-valuenow', '25');

    fireEvent.pointerMove(frame(), { clientX: 200, buttons: 1 });
    expect(slider).toHaveAttribute('aria-valuenow', '100');
    expect(
      screen.getByRole('img', { name: 'Original photo.png' }).style.clipPath,
    ).toContain('0%');
  });

  it('ignores moves without a held button', () => {
    renderView();
    mockRect(200);
    const slider = screen.getByRole('slider');

    fireEvent.pointerMove(frame(), { clientX: 0, buttons: 0 });

    expect(slider).toHaveAttribute('aria-valuenow', '50');
  });

  it('clamps the divider at both edges', () => {
    renderView();
    mockRect(200);
    const slider = screen.getByRole('slider');

    fireEvent.pointerDown(frame(), { clientX: -400 });
    expect(slider).toHaveAttribute('aria-valuenow', '0');

    fireEvent.pointerDown(frame(), { clientX: 900 });
    expect(slider).toHaveAttribute('aria-valuenow', '100');
  });

  it('ignores pointer input while the frame has no width', () => {
    renderView();
    mockRect(0);
    const slider = screen.getByRole('slider');

    fireEvent.pointerDown(frame(), { clientX: 50 });

    expect(slider).toHaveAttribute('aria-valuenow', '50');
  });

  it('moves the divider with the keyboard', () => {
    renderView();
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '52');

    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(slider).toHaveAttribute('aria-valuenow', '50');

    fireEvent.keyDown(slider, { key: 'Home' });
    expect(slider).toHaveAttribute('aria-valuenow', '0');

    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(slider).toHaveAttribute('aria-valuenow', '0');

    fireEvent.keyDown(slider, { key: 'End' });
    expect(slider).toHaveAttribute('aria-valuenow', '100');

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '100');
  });

  it('leaves the divider alone for unrelated keys', () => {
    renderView();
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'Enter' });

    expect(slider).toHaveAttribute('aria-valuenow', '50');
  });
});
