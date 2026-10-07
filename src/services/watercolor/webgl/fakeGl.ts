import { vi } from 'vitest';

/**
 * Test support: a stand-in WebGL2 context. Every method resolves to a
 * mock, enum-like constants resolve to numbers, and per-name results can
 * be overridden per test.
 */

const GL_METHODS = new Set([
  'attachShader',
  'bindBuffer',
  'bindFramebuffer',
  'bindTexture',
  'bindVertexArray',
  'bufferData',
  'compileShader',
  'createBuffer',
  'createFramebuffer',
  'createProgram',
  'createShader',
  'createTexture',
  'createVertexArray',
  'deleteBuffer',
  'deleteFramebuffer',
  'deleteProgram',
  'deleteTexture',
  'deleteVertexArray',
  'disable',
  'drawArrays',
  'enableVertexAttribArray',
  'framebufferTexture2D',
  'activeTexture',
  'getUniformLocation',
  'linkProgram',
  'pixelStorei',
  'shaderSource',
  'texImage2D',
  'texParameteri',
  'uniform1f',
  'uniform1i',
  'uniform2f',
  'useProgram',
  'vertexAttribPointer',
  'viewport',
  'getParameter',
  'getExtension',
  'getShaderParameter',
  'getShaderInfoLog',
  'getProgramParameter',
  'getProgramInfoLog',
]);

const DEFAULT_RESULTS: Record<string, unknown> = {
  createBuffer: {},
  createFramebuffer: {},
  createProgram: {},
  createShader: {},
  createTexture: {},
  createVertexArray: {},
  getExtension: null,
  getParameter: 8192,
  getProgramInfoLog: null,
  getProgramParameter: true,
  getShaderInfoLog: null,
  getShaderParameter: true,
  getUniformLocation: {},
};

export function createFakeGl(
  results: Record<string, unknown> = {},
): WebGL2RenderingContext {
  const merged = { ...DEFAULT_RESULTS, ...results };
  const cache = new Map<string, unknown>();
  let nextConstant = 1;
  return new Proxy(
    {},
    {
      get(_target, property) {
        const key = String(property);
        if (cache.has(key)) {
          return cache.get(key);
        }
        let value: unknown;
        if (key in merged) {
          value = vi.fn().mockReturnValue(merged[key]);
        } else if (GL_METHODS.has(key)) {
          value = vi.fn();
        } else {
          value = nextConstant++;
        }
        cache.set(key, value);
        return value;
      },
    },
  ) as WebGL2RenderingContext;
}
