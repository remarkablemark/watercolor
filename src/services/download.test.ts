import {
  DEFAULT_QUALITY,
  DOWNLOAD_FORMATS,
  downloadBlob,
  downloadFilename,
  encodeImage,
  extensionFor,
  resolveDownloadFormat,
  supportsEncoding,
} from './download';

describe('resolveDownloadFormat', () => {
  it('defaults to the source format when it is encodable', () => {
    expect(resolveDownloadFormat('image/jpeg')).toBe('image/jpeg');
    expect(resolveDownloadFormat('image/png')).toBe('image/png');
    expect(resolveDownloadFormat('image/webp')).toBe('image/webp');
  });

  it('falls back to png for everything else', () => {
    expect(resolveDownloadFormat('image/gif')).toBe('image/png');
    expect(resolveDownloadFormat('image/avif')).toBe('image/png');
    expect(resolveDownloadFormat('')).toBe('image/png');
  });
});

describe('extensionFor', () => {
  it('maps formats to file extensions', () => {
    expect(extensionFor('image/png')).toBe('png');
    expect(extensionFor('image/jpeg')).toBe('jpg');
    expect(extensionFor('image/webp')).toBe('webp');
  });
});

describe('supportsEncoding', () => {
  it('reports formats the canvas encoder accepts', () => {
    expect(DOWNLOAD_FORMATS.every((format) => supportsEncoding(format))).toBe(
      true,
    );
  });

  it('reports false when the encoder falls back to png', () => {
    const spy = vi
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValue('data:image/png;base64,AAAA');
    expect(supportsEncoding('image/webp')).toBe(false);
    spy.mockRestore();
  });
});

describe('downloadFilename', () => {
  it('appends the watercolor suffix to the source base name', () => {
    expect(downloadFilename('beach.jpg', 'image/jpeg')).toBe(
      'beach-watercolor.jpg',
    );
    expect(downloadFilename('my.trip.png', 'image/webp')).toBe(
      'my.trip-watercolor.webp',
    );
  });

  it('handles names without a usable base', () => {
    expect(downloadFilename('.png', 'image/png')).toBe(
      'watercolor-watercolor.png',
    );
    expect(downloadFilename('archive', 'image/png')).toBe(
      'archive-watercolor.png',
    );
  });
});

describe('encodeImage', () => {
  it('resolves with the encoded blob', async () => {
    const canvas = document.createElement('canvas');
    const blob = await encodeImage(canvas, 'image/png');
    expect(blob.type).toBe('image/png');
  });

  it('passes the quality hint to the encoder', async () => {
    const canvas = document.createElement('canvas');
    const spy = vi.spyOn(canvas, 'toBlob');
    await encodeImage(canvas, 'image/jpeg');
    expect(spy).toHaveBeenCalledWith(
      expect.any(Function),
      'image/jpeg',
      DEFAULT_QUALITY,
    );
  });

  it('rejects when encoding fails', async () => {
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'toBlob').mockImplementation((callback) => {
      callback(null);
    });
    await expect(encodeImage(canvas, 'image/png')).rejects.toThrow(
      'Image encoding failed',
    );
  });
});

describe('downloadBlob', () => {
  it('revokes the object url after clicking an anchor', () => {
    const create = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:download');
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    downloadBlob(new Blob(['x']), 'painting.png');

    expect(create).toHaveBeenCalledTimes(1);
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('painting.png');
    expect(anchor.href).toBe('blob:download');
    expect(revoke).toHaveBeenCalledWith('blob:download');
    click.mockRestore();
  });
});
