import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Dropzone } from '.';

function zoneFromText(text: RegExp): HTMLElement {
  return screen.getByText(text).closest('div') as HTMLElement;
}

describe('Dropzone', () => {
  it('shows the hero prompt with a hidden file input', () => {
    render(<Dropzone onFile={vi.fn()} />);

    expect(
      screen.getByText(/Drop an image, paste from the clipboard/i),
    ).toBeInTheDocument();
    const input = screen.getByLabelText('Browse files');
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', 'image/*');
  });

  it('emits the chosen file', async () => {
    const user = userEvent.setup();
    const onFile = vi.fn();
    render(<Dropzone onFile={onFile} />);
    const file = new File(['x'], 'photo.png', { type: 'image/png' });

    await user.upload(screen.getByLabelText('Browse files'), file);

    expect(onFile).toHaveBeenCalledWith(file);
  });

  it('emits dropped files and clears the drag state', () => {
    const onFile = vi.fn();
    render(<Dropzone onFile={onFile} />);
    const zone = zoneFromText(/Drop an image, paste from the clipboard/i);
    const file = new File(['x'], 'beach.jpg', { type: 'image/jpeg' });

    fireEvent.dragOver(zone);
    expect(zone.className).toContain('border-sky-500');
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    expect(onFile).toHaveBeenCalledWith(file);
    expect(zone.className).not.toContain('border-sky-500');
  });

  it('ignores drops without files', () => {
    const onFile = vi.fn();
    render(<Dropzone onFile={onFile} />);
    const zone = zoneFromText(/Drop an image, paste from the clipboard/i);

    fireEvent.drop(zone, { dataTransfer: { files: [] } });

    expect(onFile).not.toHaveBeenCalled();
  });

  it('clears the drag highlight when the pointer leaves', () => {
    render(<Dropzone onFile={vi.fn()} />);
    const zone = zoneFromText(/Drop an image, paste from the clipboard/i);

    fireEvent.dragOver(zone);
    fireEvent.dragLeave(zone);

    expect(zone.className).not.toContain('border-sky-500');
  });

  it('ignores drops while disabled', () => {
    const onFile = vi.fn();
    render(<Dropzone onFile={onFile} disabled />);
    const zone = zoneFromText(/Drop an image, paste from the clipboard/i);

    expect(screen.getByLabelText('Browse files')).toBeDisabled();
    fireEvent.drop(zone, {
      dataTransfer: {
        files: [new File(['x'], 'a.png', { type: 'image/png' })],
      },
    });

    expect(onFile).not.toHaveBeenCalled();
  });

  it('shows a loading label and disables input while loading', () => {
    render(<Dropzone onFile={vi.fn()} loading />);

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading…')).toBeDisabled();
  });

  it('renders a compact variant without the hero prompt', () => {
    render(<Dropzone onFile={vi.fn()} variant="button" />);

    expect(screen.getByText('Choose another image')).toBeInTheDocument();
    expect(
      screen.queryByText(/Drop an image, paste from the clipboard/i),
    ).not.toBeInTheDocument();
  });
});
