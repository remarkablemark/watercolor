/* v8 ignore file -- @preserve */
// GLSL sources for the GPU path. They mirror the CPU pipeline:
// pass 1 Kuwahara (flatten inside), passes 2-3 separable wash blur,
// pass 4 composite (saturation, posterize, edges, paper grain).

export const VERTEX_SHADER = `#version 300 es
layout(location = 0) in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

export const FRAGMENT_KUWAHARA = `#version 300 es
precision highp float;

uniform sampler2D uSource;
uniform vec2 uSize;
uniform float uRadius;

in vec2 vUv;
out vec4 fragColor;

const vec3 PAPER = vec3(251.0, 248.0, 241.0);
const int MAX_RADIUS = 48;

void main() {
  if (uRadius < 0.5) {
    vec4 c = texture(uSource, vUv);
    fragColor = vec4(c.rgb * c.a + PAPER * (1.0 - c.a), 1.0);
    return;
  }
  int radius = int(uRadius + 0.5);
  ivec2 center = ivec2(floor(vUv * uSize));
  vec3 bestMean = vec3(0.0);
  vec3 bestVar = vec3(1e12);
  for (int quadrant = 0; quadrant < 4; quadrant++) {
    float xSign = quadrant == 0 || quadrant == 2 ? -1.0 : 1.0;
    float ySign = quadrant < 2 ? -1.0 : 1.0;
    vec3 sum = vec3(0.0);
    vec3 sumSq = vec3(0.0);
    float count = 0.0;
    for (int dy = 0; dy <= MAX_RADIUS; dy++) {
      if (dy > radius) break;
      for (int dx = 0; dx <= MAX_RADIUS; dx++) {
        if (dx > radius) break;
        vec2 pos = vec2(center) + vec2(float(dx) * xSign, float(dy) * ySign);
        if (pos.x < 0.0 || pos.y < 0.0 || pos.x > uSize.x - 1.0 || pos.y > uSize.y - 1.0) {
          continue;
        }
        vec4 texel = texture(uSource, (pos + 0.5) / uSize);
        vec3 color = texel.rgb * texel.a + PAPER * (1.0 - texel.a);
        sum += color;
        sumSq += color * color;
        count += 1.0;
      }
    }
    vec3 mean = sum / count;
    vec3 variance = sumSq / count - mean * mean;
    bvec3 better = lessThan(variance, bestVar);
    bestMean = mix(bestMean, mean, vec3(better));
    bestVar = mix(bestVar, variance, vec3(better));
  }
  fragColor = vec4(bestMean, 1.0);
}`;

export const FRAGMENT_BLUR = `#version 300 es
precision highp float;

uniform sampler2D uSource;
uniform vec2 uTexel;
uniform vec2 uDirection;
uniform float uRadius;

in vec2 vUv;
out vec4 fragColor;

const int MAX_BLUR = 64;

void main() {
  int radius = int(uRadius + 0.5);
  vec3 sum = vec3(0.0);
  float count = 0.0;
  for (int i = -MAX_BLUR; i <= MAX_BLUR; i++) {
    if (abs(i) > radius) break;
    vec2 uv = vUv + uDirection * uTexel * float(i);
    if (uv.x < uTexel.x * 0.5 || uv.x > 1.0 - uTexel.x * 0.5) continue;
    if (uv.y < uTexel.y * 0.5 || uv.y > 1.0 - uTexel.y * 0.5) continue;
    sum += texture(uSource, uv).rgb;
    count += 1.0;
  }
  fragColor = vec4(sum / max(count, 1.0), 1.0);
}`;

export const FRAGMENT_COMPOSITE = `#version 300 es
precision highp float;

uniform sampler2D uSmooth;
uniform sampler2D uBlurred;
uniform vec2 uStructureTexel;
uniform float uWash;
uniform float uEdge;
uniform float uSaturation;
uniform float uLevels;
uniform float uGrain;
uniform float uGrainCell;

in vec2 vUv;
out vec4 fragColor;

const vec3 PAPER = vec3(251.0, 248.0, 241.0);
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

float luma(vec3 color) {
  return dot(color, LUMA);
}

float edgeAt(sampler2D tex, vec2 uv) {
  float a = luma(texture(tex, uv + uStructureTexel * vec2(-1.0, -1.0)).rgb);
  float b = luma(texture(tex, uv + uStructureTexel * vec2(0.0, -1.0)).rgb);
  float c = luma(texture(tex, uv + uStructureTexel * vec2(1.0, -1.0)).rgb);
  float d = luma(texture(tex, uv + uStructureTexel * vec2(-1.0, 0.0)).rgb);
  float f = luma(texture(tex, uv + uStructureTexel * vec2(1.0, 0.0)).rgb);
  float g = luma(texture(tex, uv + uStructureTexel * vec2(-1.0, 1.0)).rgb);
  float h = luma(texture(tex, uv + uStructureTexel * vec2(0.0, 1.0)).rgb);
  float k = luma(texture(tex, uv + uStructureTexel * vec2(1.0, 1.0)).rgb);
  float gx = -a - 2.0 * d - g + c + 2.0 * f + k;
  float gy = -a - 2.0 * b - c + g + 2.0 * h + k;
  return min(1.0, sqrt(gx * gx + gy * gy) / 4.0);
}

float hash(vec2 point) {
  vec3 p3 = fract(vec3(point.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float valueNoise(vec2 point) {
  vec2 cell = floor(point);
  vec2 frac = fract(point);
  vec2 curve = frac * frac * (3.0 - 2.0 * frac);
  float a = hash(cell);
  float b = hash(cell + vec2(1.0, 0.0));
  float c = hash(cell + vec2(0.0, 1.0));
  float d = hash(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, curve.x), mix(c, d, curve.x), curve.y);
}

float grainNoise(vec2 point) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int octave = 0; octave < 3; octave++) {
    value += amplitude * valueNoise(point);
    point *= 2.0;
    amplitude *= 0.5;
  }
  return value / 0.875;
}

void main() {
  vec3 color = mix(texture(uSmooth, vUv).rgb, texture(uBlurred, vUv).rgb, uWash);

  float gray = luma(color);
  color = vec3(gray) + (color - vec3(gray)) * uSaturation;

  if (uLevels >= 2.0) {
    float steps = uLevels - 1.0;
    color = floor(color / 255.0 * steps + 0.5) / steps * 255.0;
  }

  if (uEdge > 0.0) {
    float edge = mix(edgeAt(uSmooth, vUv), edgeAt(uBlurred, vUv), uWash);
    color *= 1.0 - uEdge * 0.6 * edge;
  }

  if (uGrain > 0.0) {
    float grain = grainNoise(gl_FragCoord.xy / uGrainCell) - 0.5;
    float tone = luma(color);
    color *= 1.0 + grain * uGrain * (1.0 + 0.8 * (1.0 - tone / 255.0));
    if (tone > 190.0) {
      float tint = uGrain * 0.35 * min(1.0, (tone - 190.0) / 65.0);
      color += (PAPER - color) * tint;
    }
  }

  fragColor = vec4(clamp(color, 0.0, 255.0), 1.0);
}`;
