import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/**
 * Film-grade pass between bloom and output: subtle radial chromatic
 * aberration, animated grain and a mild vignette for the noir grade.
 * Grain is damped (not animated) under reduced motion.
 */
export const FilmShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: 0.045 },
    uVignette: { value: 0.32 },
    uAberration: { value: 0.0032 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrain;
    uniform float uVignette;
    uniform float uAberration;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      vec2 cc = uv - 0.5;
      float r2 = dot(cc, cc);
      vec2 off = cc * r2 * uAberration * 6.0;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + off).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - off).b;
      float g = hash(uv * 913.0 + fract(uTime) * 61.7);
      col += (g - 0.5) * uGrain;
      col *= 1.0 - uVignette * smoothstep(0.08, 0.85, r2);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class FilmPass extends ShaderPass {
  constructor() {
    super(FilmShader);
  }

  setTime(time: number): void {
    this.uniforms.uTime.value = time;
  }

  setReducedMotion(reduced: boolean): void {
    if (reduced) this.uniforms.uTime.value = 0;
    this.uniforms.uGrain.value = reduced ? 0.012 : 0.045;
  }
}
