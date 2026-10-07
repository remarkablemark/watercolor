import { DEFAULT_PARAMS } from '../params';
import { createFakeGl } from './fakeGl';
import { createGlRenderer } from './glRenderer';

/* eslint-disable @typescript-eslint/unbound-method -- the fake GL context exposes every method as a memoized vitest mock */

function fakeCanvas(): HTMLCanvasElement {
  return { width: 0, height: 0 } as HTMLCanvasElement;
}

describe('createGlRenderer', () => {
  it('renders a frame with the four GPU passes', () => {
    const canvas = fakeCanvas();
    const gl = createFakeGl();
    const renderer = createGlRenderer(canvas, gl);

    expect(renderer.backend).toBe('webgl');
    renderer.render(new ImageData(8, 8), DEFAULT_PARAMS);

    expect(vi.mocked(gl.drawArrays)).toHaveBeenCalledTimes(4);
    expect(canvas.width).toBe(8);
    expect(canvas.height).toBe(8);
  });

  it('skips reallocation when the size is unchanged', () => {
    const canvas = fakeCanvas();
    const gl = createFakeGl();
    const renderer = createGlRenderer(canvas, gl);
    const image = new ImageData(4, 4);

    renderer.render(image, DEFAULT_PARAMS);
    const uploads = vi
      .mocked(gl.texImage2D)
      .mock.calls.filter((call) => Array.from(call).length === 6).length;
    renderer.render(image, DEFAULT_PARAMS);
    const uploadsAfter = vi
      .mocked(gl.texImage2D)
      .mock.calls.filter((call) => Array.from(call).length === 6).length;

    expect(uploadsAfter).toBe(uploads + 1);
  });

  it('rejects images larger than the GPU texture limit', () => {
    const gl = createFakeGl({ getParameter: 2 });
    const renderer = createGlRenderer(fakeCanvas(), gl);

    expect(() => {
      renderer.render(new ImageData(8, 8), DEFAULT_PARAMS);
    }).toThrow('Image exceeds the GPU texture size limit of 2px');
    expect(vi.mocked(gl.drawArrays)).not.toHaveBeenCalled();
  });

  it('throws when a shader fails to compile', () => {
    const gl = createFakeGl({ getShaderParameter: false });
    expect(() => createGlRenderer(fakeCanvas(), gl)).toThrow(
      'Shader compilation failed',
    );
  });

  it('throws when a program fails to link', () => {
    const gl = createFakeGl({ getProgramParameter: false });
    expect(() => createGlRenderer(fakeCanvas(), gl)).toThrow(
      'Program link failed',
    );
  });

  it('throws when GPU resources cannot be allocated', () => {
    const gl = createFakeGl({ createFramebuffer: null });
    expect(() => createGlRenderer(fakeCanvas(), gl)).toThrow(
      'Unable to allocate GPU framebuffer',
    );
  });

  it('releases GPU resources on dispose', () => {
    const gl = createFakeGl();
    const renderer = createGlRenderer(fakeCanvas(), gl);

    renderer.dispose();

    expect(vi.mocked(gl.deleteProgram)).toHaveBeenCalledTimes(3);
    expect(vi.mocked(gl.deleteTexture)).toHaveBeenCalledTimes(4);
    expect(vi.mocked(gl.deleteFramebuffer)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(gl.deleteVertexArray)).toHaveBeenCalledTimes(1);
  });
});
