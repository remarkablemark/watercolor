import { useEffect, useRef, useState } from 'react';
import { loadImage } from 'src/services/image';

/** A decoded image plus the metadata the UI needs. */
export interface SourceImage {
  element: HTMLImageElement;
  name: string;
  type: string;
  width: number;
  height: number;
  url: string;
}

export interface UseImageFileResult {
  image: SourceImage | null;
  error: string | null;
  loading: boolean;
  loadFile: (file: File) => void;
  clear: () => void;
}

interface ImageFileState {
  image: SourceImage | null;
  error: string | null;
  loading: boolean;
}

function isSupported(file: File): boolean {
  return !file.type || file.type.startsWith('image/');
}

/**
 * Owns the selected image file: validation, object URL lifecycle, async
 * decode, and app-wide clipboard paste.
 */
export function useImageFile(): UseImageFileResult {
  const [state, setState] = useState<ImageFileState>({
    image: null,
    error: null,
    loading: false,
  });
  const requestRef = useRef(0);
  const urlRef = useRef<string | null>(null);

  const loadFile = (file: File): void => {
    if (!isSupported(file)) {
      setState({
        image: null,
        error: `Unsupported file type: ${file.type}`,
        loading: false,
      });
      return;
    }
    const request = ++requestRef.current;
    const url = URL.createObjectURL(file);
    setState({ image: null, error: null, loading: true });
    loadImage(url)
      .then((element) => {
        if (requestRef.current !== request) {
          URL.revokeObjectURL(url);
          return;
        }
        if (urlRef.current) {
          URL.revokeObjectURL(urlRef.current);
        }
        urlRef.current = url;
        setState({
          image: {
            element,
            name: file.name || 'image',
            type: file.type || 'image/png',
            width: element.naturalWidth,
            height: element.naturalHeight,
            url,
          },
          error: null,
          loading: false,
        });
      })
      .catch((cause: unknown) => {
        if (requestRef.current === request) {
          setState({
            image: null,
            error:
              cause instanceof Error ? cause.message : 'Unable to load image',
            loading: false,
          });
        }
        URL.revokeObjectURL(url);
      });
  };

  const loadFileRef = useRef(loadFile);

  useEffect(() => {
    loadFileRef.current = loadFile;
  });

  const clear = (): void => {
    requestRef.current++;
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setState({ image: null, error: null, loading: false });
  };

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent): void => {
      const items = Array.from(event.clipboardData?.items ?? []);
      const imageItem = items.find(
        (item) => item.kind === 'file' && item.type.startsWith('image/'),
      );
      const file =
        imageItem?.getAsFile() ?? event.clipboardData?.files[0] ?? null;
      if (file && isSupported(file)) {
        loadFileRef.current(file);
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  useEffect(() => {
    return () => {
      // Pending loads must observe the bump at unmount time so they
      // revoke their own URL instead of touching dead state.
      // eslint-disable-next-line react-hooks/exhaustive-deps, react-x/exhaustive-deps
      requestRef.current++;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, []);

  return { ...state, loadFile, clear };
}
