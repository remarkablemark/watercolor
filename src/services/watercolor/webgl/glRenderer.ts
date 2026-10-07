import type { WatercolorParams } from 'src/types/watercolor';

import { bleedRadius } from '../bleed';
import { fitSize, STRUCTURE_MAX_DIM } from '../geometry';
import { kuwaharaRadius } from '../kuwahara';
import { clampParams } from '../params';
import type { WatercolorRenderer } from '../renderer.types';
import {
  FRAGMENT_BLUR,
  FRAGMENT_COMPOSITE,
  FRAGMENT_KUWAHARA,
  VERTEX_SHADER,
} from './shaders';

function required<T>(value: T | null, label: string): T {
  if (value === null) {
    throw new Error(`Unable to allocate GPU ${label}`);
  }
  return value;
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = required(gl.createShader(type), 'shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(
      `Shader compilation failed: ${gl.getShaderInfoLog(shader) ?? ''}`,
    );
  }
  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  fragmentSource: string,
): WebGLProgram {
  const program = required(gl.createProgram(), 'program');
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(
    program,
    compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource),
  );
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(
      `Program link failed: ${gl.getProgramInfoLog(program) ?? ''}`,
    );
  }
  return program;
}

/**
 * Creates the GPU renderer. Throws when shaders fail to compile or GPU
 * resources are unavailable; callers fall back to the CPU path.
 */
export function createGlRenderer(
  canvas: HTMLCanvasElement,
  gl: WebGL2RenderingContext,
): WatercolorRenderer {
  const programs = {
    kuwahara: createProgram(gl, FRAGMENT_KUWAHARA),
    blur: createProgram(gl, FRAGMENT_BLUR),
    composite: createProgram(gl, FRAGMENT_COMPOSITE),
  };
  const buffer = required(gl.createBuffer(), 'buffer');
  const vertexArray = required(gl.createVertexArray(), 'vertex array');
  const framebuffer = required(gl.createFramebuffer(), 'framebuffer');
  const sourceTexture = required(gl.createTexture(), 'texture');
  const structureTextures = [
    required(gl.createTexture(), 'texture'),
    required(gl.createTexture(), 'texture'),
    required(gl.createTexture(), 'texture'),
  ];

  gl.bindVertexArray(vertexArray);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.disable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  let sourceSize = { width: 0, height: 0 };
  let structureSize = { width: 0, height: 0 };

  function configureTexture(
    texture: WebGLTexture,
    width: number,
    height: number,
  ): void {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  function draw(): void {
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function render(source: ImageData, params: WatercolorParams): void {
    const options = clampParams(params);
    const { width, height } = source;
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    if (width > maxTextureSize || height > maxTextureSize) {
      throw new Error(
        `Image exceeds the GPU texture size limit of ${String(maxTextureSize)}px`,
      );
    }
    const structure = fitSize(width, height, STRUCTURE_MAX_DIM);
    if (width !== sourceSize.width || height !== sourceSize.height) {
      sourceSize = { width, height };
      canvas.width = width;
      canvas.height = height;
      configureTexture(sourceTexture, width, height);
    }
    if (
      structure.width !== structureSize.width ||
      structure.height !== structureSize.height
    ) {
      structureSize = structure;
      for (const texture of structureTextures) {
        configureTexture(texture, structure.width, structure.height);
      }
    }

    const sourceMin = Math.min(width, height);
    const structureMin = Math.min(structure.width, structure.height);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    // Pass 1: Kuwahara smoothing into the structure-sized target.
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, structure.width, structure.height);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      structureTextures[0],
      0,
    );
    gl.useProgram(programs.kuwahara);
    gl.uniform1i(gl.getUniformLocation(programs.kuwahara, 'uSource'), 0);
    gl.uniform2f(
      gl.getUniformLocation(programs.kuwahara, 'uSize'),
      width,
      height,
    );
    gl.uniform1f(
      gl.getUniformLocation(programs.kuwahara, 'uRadius'),
      kuwaharaRadius(structureMin, options.detail) * (sourceMin / structureMin),
    );
    draw();

    // Passes 2-3: separable wash blur across the structure buffer.
    const blurRadius = bleedRadius(structureMin, options.wash);
    gl.useProgram(programs.blur);
    gl.uniform1i(gl.getUniformLocation(programs.blur, 'uSource'), 0);
    gl.uniform1f(gl.getUniformLocation(programs.blur, 'uRadius'), blurRadius);
    gl.uniform2f(
      gl.getUniformLocation(programs.blur, 'uTexel'),
      1 / structure.width,
      1 / structure.height,
    );
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      structureTextures[1],
      0,
    );
    gl.uniform2f(gl.getUniformLocation(programs.blur, 'uDirection'), 1, 0);
    gl.bindTexture(gl.TEXTURE_2D, structureTextures[0]);
    draw();

    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      structureTextures[2],
      0,
    );
    gl.uniform2f(gl.getUniformLocation(programs.blur, 'uDirection'), 0, 1);
    gl.bindTexture(gl.TEXTURE_2D, structureTextures[1]);
    draw();

    // Pass 4: composite onto the canvas.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.useProgram(programs.composite);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, structureTextures[0]);
    gl.uniform1i(gl.getUniformLocation(programs.composite, 'uSmooth'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, structureTextures[2]);
    gl.uniform1i(gl.getUniformLocation(programs.composite, 'uBlurred'), 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform2f(
      gl.getUniformLocation(programs.composite, 'uStructureTexel'),
      1 / structure.width,
      1 / structure.height,
    );
    gl.uniform1f(
      gl.getUniformLocation(programs.composite, 'uWash'),
      options.wash,
    );
    gl.uniform1f(
      gl.getUniformLocation(programs.composite, 'uEdge'),
      options.edge,
    );
    gl.uniform1f(
      gl.getUniformLocation(programs.composite, 'uSaturation'),
      options.saturation,
    );
    gl.uniform1f(
      gl.getUniformLocation(programs.composite, 'uLevels'),
      options.posterizeLevels,
    );
    gl.uniform1f(
      gl.getUniformLocation(programs.composite, 'uGrain'),
      options.paperTexture,
    );
    gl.uniform1f(
      gl.getUniformLocation(programs.composite, 'uGrainCell'),
      Math.max(0.25, sourceMin / 768),
    );
    draw();
  }

  return {
    backend: 'webgl',
    render,
    dispose(): void {
      for (const program of Object.values(programs)) {
        gl.deleteProgram(program);
      }
      gl.deleteTexture(sourceTexture);
      for (const texture of structureTextures) {
        gl.deleteTexture(texture);
      }
      gl.deleteFramebuffer(framebuffer);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vertexArray);
    },
  };
}
