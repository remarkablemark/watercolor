import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { downloadBlob, encodeImage } from 'src/services/download';
import type { DownloadFormat } from 'src/types/watercolor';

import { DownloadBar } from '.';

vi.mock('src/services/download', async (importOriginal) => {
  const actual = await importOriginal<typeof import('src/services/download')>();
  return { ...actual, encodeImage: vi.fn(), downloadBlob: vi.fn() };
});

const ALL_FORMATS: readonly DownloadFormat[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
];

function renderBar(options: {
  canvas?: HTMLCanvasElement | null;
  disabled?: boolean;
}) {
  const canvas =
    options.canvas === undefined
      ? document.createElement('canvas')
      : options.canvas;
  return render(
    <DownloadBar
      sourceName="beach.png"
      initialFormat="image/png"
      formats={ALL_FORMATS}
      canvasRef={{ current: canvas }}
      disabled={options.disabled ?? false}
    />,
  );
}

describe('DownloadBar', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('lists the available formats', () => {
    renderBar({});

    expect(screen.getByRole('option', { name: 'PNG' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'JPEG' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'WEBP' })).toBeInTheDocument();
    expect(screen.getByLabelText('Format')).toHaveValue('image/png');
  });

  it('tracks format changes', () => {
    renderBar({});

    fireEvent.change(screen.getByLabelText('Format'), {
      target: { value: 'image/webp' },
    });

    expect(screen.getByLabelText('Format')).toHaveValue('image/webp');
  });

  it('encodes the canvas and downloads the blob', async () => {
    let finish: ((blob: Blob) => void) | undefined;
    vi.mocked(encodeImage).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const blob = new Blob(['png'], { type: 'image/png' });
    renderBar({});
    const button = screen.getByRole('button', { name: 'Download' });

    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Preparing…');
    fireEvent.click(button);
    expect(encodeImage).toHaveBeenCalledTimes(1);

    finish?.(blob);

    await waitFor(() => {
      expect(downloadBlob).toHaveBeenCalledWith(blob, 'beach-watercolor.png');
    });
    expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled();
  });

  it('reports encode failures', async () => {
    vi.mocked(encodeImage).mockRejectedValue(new Error('boom'));
    renderBar({});

    fireEvent.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('boom');
    });
    expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled();
  });

  it('uses a fallback message for non-error failures', async () => {
    vi.mocked(encodeImage).mockRejectedValue('weird');
    renderBar({});

    fireEvent.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Download failed');
    });
  });

  it('does nothing without a canvas', () => {
    renderBar({ canvas: null });

    fireEvent.click(screen.getByRole('button', { name: 'Download' }));

    expect(encodeImage).not.toHaveBeenCalled();
  });

  it('stays disabled when the render is not idle', () => {
    renderBar({ disabled: true });

    expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled();
  });
});
