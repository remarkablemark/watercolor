import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';
import { IDLE_DELAY_MS } from 'src/hooks/useWatercolor';
import { imageToImageData } from 'src/services/canvas';
import { downloadBlob, encodeImage } from 'src/services/download';
import { loadImage } from 'src/services/image';
import { PARAM_META } from 'src/services/watercolor/params';
import { getPreset, PRESETS } from 'src/services/watercolor/presets';

import { App } from '.';

vi.mock('src/services/image', async (importOriginal) => {
  const actual = await importOriginal<typeof import('src/services/image')>();
  return { ...actual, loadImage: vi.fn() };
});

vi.mock('src/services/download', async (importOriginal) => {
  const actual = await importOriginal<typeof import('src/services/download')>();
  return { ...actual, encodeImage: vi.fn(), downloadBlob: vi.fn() };
});

vi.mock('src/services/canvas', () => ({
  imageToImageData: vi.fn(() => new ImageData(8, 6)),
}));

function fakeImage(width = 8, height = 6): HTMLImageElement {
  const element = document.createElement('img');
  Object.defineProperty(element, 'naturalWidth', { value: width });
  Object.defineProperty(element, 'naturalHeight', { value: height });
  return element;
}

async function uploadImage(
  user: UserEvent,
  name = 'beach.png',
  type = 'image/png',
): Promise<void> {
  const file = new File(['x'], name, { type });
  await user.upload(screen.getByLabelText('Browse files'), file);
}

/** Waits out the quick frame and the settle timer inside `act`. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, IDLE_DELAY_MS + 20);
    });
  });
}

describe('App', () => {
  beforeEach(() => {
    vi.mocked(loadImage).mockResolvedValue(fakeImage());
    vi.mocked(imageToImageData).mockImplementation(() => new ImageData(8, 6));
    vi.mocked(encodeImage).mockResolvedValue(
      new Blob(['x'], { type: 'image/png' }),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the hero dropzone with no image', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Watercolor Studio' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Drop an image here/i)).toBeInTheDocument();
  });

  it('uploads an image into the editor', async () => {
    const user = userEvent.setup();
    render(<App />);

    await uploadImage(user);

    expect(await screen.findByText('Painting…')).toBeInTheDocument();
    await settle();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getAllByRole('slider')).toHaveLength(PARAM_META.length + 1);
    expect(screen.getByRole('button', { name: 'Sketch' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remove image' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Original beach.png' }),
    ).toBeInTheDocument();
  });

  it('shows an error for unsupported dropped files', () => {
    render(<App />);
    const zone = screen
      .getByText(/Drop an image here/i)
      .closest('div') as HTMLElement;
    const pdf = new File(['x'], 'notes.pdf', { type: 'application/pdf' });

    fireEvent.drop(zone, { dataTransfer: { files: [pdf] } });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Unsupported file type: application/pdf',
    );
    expect(screen.getByText(/Drop an image here/i)).toBeInTheDocument();
  });

  it('applies a preset to the controls', async () => {
    const user = userEvent.setup();
    render(<App />);
    await uploadImage(user);
    await settle();

    await user.click(screen.getByRole('button', { name: 'Sketch' }));

    expect(screen.getByRole('button', { name: 'Sketch' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText('Saturation')).toHaveValue(
      String(getPreset('sketch').params.saturation),
    );
  });

  it('clears the active preset when a slider moves', async () => {
    const user = userEvent.setup();
    render(<App />);
    await uploadImage(user);
    await settle();
    await user.click(screen.getByRole('button', { name: 'Sketch' }));

    const customDetail =
      ['0.5', '0.51', '0.52'].find((value) =>
        PRESETS.every((preset) => String(preset.params.detail) !== value),
      ) ?? '0.5';
    fireEvent.change(screen.getByLabelText('Detail'), {
      target: { value: customDetail },
    });

    expect(screen.getByRole('button', { name: 'Sketch' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Loose' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('downloads with a source-derived filename', async () => {
    const user = userEvent.setup();
    render(<App />);
    await uploadImage(user);
    await settle();

    await user.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(downloadBlob).toHaveBeenCalledWith(
        expect.any(Blob),
        'beach-watercolor.png',
      );
    });
  });

  it('follows the chosen output format', async () => {
    const user = userEvent.setup();
    render(<App />);
    await uploadImage(user, 'shot.jpg', 'image/jpeg');
    await settle();
    expect(screen.getByLabelText('Format')).toHaveValue('image/jpeg');

    fireEvent.change(screen.getByLabelText('Format'), {
      target: { value: 'image/webp' },
    });
    await user.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(downloadBlob).toHaveBeenCalledWith(
        expect.any(Blob),
        'shot-watercolor.webp',
      );
    });
  });

  it('warns when the image exceeds the render budget', async () => {
    const user = userEvent.setup();
    vi.mocked(loadImage).mockResolvedValue(fakeImage(5000, 4801));
    render(<App />);

    await uploadImage(user);

    expect(await screen.findByText(/capped at 24 megapixels/i)).toBeVisible();
  });

  it('surfaces render failures in the status line', async () => {
    const user = userEvent.setup();
    vi.mocked(imageToImageData).mockImplementation(() => {
      throw new Error('gpu meltdown');
    });
    render(<App />);

    await uploadImage(user);

    expect(await screen.findByText('gpu meltdown')).toBeInTheDocument();
  });

  it('returns to the dropzone when the image is removed', async () => {
    const user = userEvent.setup();
    render(<App />);
    await uploadImage(user);
    await settle();

    await user.click(screen.getByRole('button', { name: 'Remove image' }));

    expect(screen.getByText(/Drop an image here/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('img', { name: 'Original beach.png' }),
    ).not.toBeInTheDocument();
  });
});
