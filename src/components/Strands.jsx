import { useEffect, useRef } from "react";
import { Color, Mesh, Program, Renderer, Triangle } from "ogl";
import "./Strands.css";

const VERTEX = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColors[4];
uniform float uSpeed;
uniform float uAmplitude;
uniform float uWaviness;
uniform float uThickness;
uniform float uGlow;
uniform float uTaper;
uniform float uSpread;
uniform float uIntensity;
uniform float uOpacity;
uniform float uScale;
uniform float uSaturation;
out vec4 fragColor;
const float PI = 3.14159265;
vec3 spectrum(float t) { return 0.5 + 0.5 * cos(2.0 * PI * (t + vec3(0.0, 0.33, 0.67))); }
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  uv /= max(uScale, 0.001);
  float envelope = pow(max(cos(uv.x * PI * 1.3), 0.0), max(uTaper, 0.1));
  vec3 color = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float strand = float(i);
    float phase = strand * 1.7 * uSpread;
    float frequency = (2.0 + strand * 0.35) * uWaviness;
    float wave = sin(uv.x * frequency + uTime * uSpeed * (1.4 + strand)) * 0.6 + sin(uv.x * frequency * 1.1 - uTime * uSpeed * 0.7 + phase) * 0.4;
    float y = wave * (0.1 + 0.02 * uIntensity) * envelope * uAmplitude;
    float distanceToStrand = abs(uv.y - y);
    float width = (0.001 + 0.05 * uIntensity) * (0.35 + envelope) * uThickness;
    float glow = pow(width / (distanceToStrand + width * 0.45), 2.0) * envelope;
    float colorPosition = fract(strand / 8.0 + uv.x * 0.3 + uTime * 0.02);
    vec3 palette = mix(mix(uColors[0], uColors[1], colorPosition * 3.0), mix(uColors[2], uColors[3], colorPosition), step(0.333, colorPosition));
    color += palette * glow;
  }
  color = 1.0 - exp(-color * uGlow);
  float gray = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(gray), color, uSaturation);
  float alpha = clamp(max(max(color.r, color.g), color.b), 0.0, 1.0) * uOpacity;
  fragColor = vec4(color * uOpacity, alpha);
}
`;

const palette = (colors) => colors.slice(0, 4).map((hex) => { const color = new Color(hex); return [color.r, color.g, color.b]; });

export default function Strands({ colors = ["#ff4f9a", "#ff8fc7", "#7c3aed", "#06b6d4"], count = 3, speed = 0.5, amplitude = 1, waviness = 1, thickness = 0.7, glow = 2.6, taper = 3, spread = 1, intensity = 0.6, saturation = 1.25, opacity = 0.7, scale = 1.5, className = "" }) {
  const containerRef = useRef(null);
  const propsRef = useRef({ colors, count, speed, amplitude, waviness, thickness, glow, taper, spread, intensity, saturation, opacity, scale });

  useEffect(() => {
    propsRef.current = { colors, count, speed, amplitude, waviness, thickness, glow, taper, spread, intensity, saturation, opacity, scale };
  }, [colors, count, speed, amplitude, waviness, thickness, glow, taper, spread, intensity, saturation, opacity, scale]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const renderer = new Renderer({ alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio || 1, 2) });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    const program = new Program(gl, { vertex: VERTEX, fragment: FRAGMENT, uniforms: { uTime: { value: 0 }, uResolution: { value: [1, 1] }, uColors: { value: palette(propsRef.current.colors) }, uSpeed: { value: speed }, uAmplitude: { value: amplitude }, uWaviness: { value: waviness }, uThickness: { value: thickness }, uGlow: { value: glow }, uTaper: { value: taper }, uSpread: { value: spread }, uIntensity: { value: intensity }, uOpacity: { value: opacity }, uScale: { value: scale }, uSaturation: { value: saturation } } });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
    container.appendChild(gl.canvas);
    const resize = () => { const rect = container.getBoundingClientRect(); renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height)); program.uniforms.uResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight]; };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    let frame = 0;
    const render = (time) => { const current = propsRef.current; program.uniforms.uTime.value = time * 0.001; program.uniforms.uColors.value = palette(current.colors); program.uniforms.uSpeed.value = current.speed; program.uniforms.uAmplitude.value = current.amplitude; program.uniforms.uWaviness.value = current.waviness; program.uniforms.uThickness.value = current.thickness; program.uniforms.uGlow.value = current.glow; program.uniforms.uTaper.value = current.taper; program.uniforms.uSpread.value = current.spread; program.uniforms.uIntensity.value = current.intensity; program.uniforms.uOpacity.value = current.opacity; program.uniforms.uScale.value = current.scale; program.uniforms.uSaturation.value = current.saturation; renderer.render({ scene: mesh }); frame = requestAnimationFrame(render); };
    frame = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); if (gl.canvas.parentNode === container) container.removeChild(gl.canvas); gl.getExtension("WEBGL_lose_context")?.loseContext(); };
    // Renderer lifetime is fixed; live values are synchronized through propsRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className={`strands-container ${className}`} aria-hidden="true" />;
}
