import { useEffect, useRef } from "react";

/* ---------- Living beach (real-time WebGL) ----------
   A full-screen fragment shader paints an animated, on-brand sea: drifting
   waves, a low sun with shimmering glitter, soft clouds and grain. Pointer
   moves the sun/clouds for a parallax feel. Zero dependencies (raw WebGL).

   Resilience: if WebGL is unavailable it calls onUnsupported() and the parent
   falls back to the photo/SVG. Honors prefers-reduced-motion (renders a single
   static frame), pauses when the tab is hidden, and releases the GL context on
   unmount. */

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_ptr;      // -1..1 parallax target
uniform float u_reduced;  // 1.0 = freeze motion

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;          // 0..1, y up
  float aspect = u_res.x / max(u_res.y, 1.0);
  float t = u_time * (1.0 - u_reduced * 0.999);
  vec2 par = u_ptr * 0.025;

  vec3 navy       = vec3(0.043, 0.145, 0.271);
  vec3 teal       = vec3(0.051, 0.580, 0.533);
  vec3 aqua       = vec3(0.145, 0.830, 0.930);
  vec3 foamCol    = vec3(0.850, 0.970, 1.000);
  vec3 skyTop     = vec3(0.055, 0.180, 0.360);
  vec3 skyHorizon = vec3(0.990, 0.800, 0.560);
  vec3 sunCol     = vec3(1.000, 0.860, 0.520);

  float horizon = 0.60;
  vec3 col;

  if (uv.y > horizon) {
    // --- sky ---
    float s = (uv.y - horizon) / (1.0 - horizon);
    col = mix(skyHorizon, skyTop, pow(s, 0.85));
    float cl = fbm(vec2(uv.x * 3.0 + t * 0.012 + par.x, uv.y * 4.0));
    col = mix(col, vec3(1.0), smoothstep(0.55, 0.95, cl) * 0.16 * (0.4 + s));
    // sun
    vec2 sun = vec2(0.62 + par.x, horizon + 0.17 + par.y);
    float d = length(vec2((uv.x - sun.x) * aspect, uv.y - sun.y));
    col += sunCol * exp(-d * 3.6) * 0.6;
    col = mix(col, vec3(1.0, 0.96, 0.86), smoothstep(0.062, 0.046, d));
  } else {
    // --- sea ---
    float depth = uv.y / horizon;             // 0 near shore, 1 at horizon
    col = mix(aqua, teal, depth);
    col = mix(col, navy, pow(depth, 2.5) * 0.6);
    float w  = fbm(vec2(uv.x * 6.0 + par.x, (uv.y * 10.0) / (0.3 + depth) - t * 0.35));
    float w2 = sin(uv.x * 30.0 + t * 1.4 + w * 6.0) * 0.5 + 0.5;
    col += w * 0.12 * vec3(0.6, 0.9, 1.0);
    col += w2 * 0.04 * (1.0 - depth);
    // sun glitter under the sun
    float band    = smoothstep(0.20, 0.0, abs(uv.x - (0.62 + par.x)));
    float spark   = pow(noise(vec2(uv.x * 130.0, uv.y * 130.0 - t * 2.2)), 6.0);
    float shimmer = spark * band * smoothstep(0.0, 0.55, depth);
    col += shimmer * vec3(1.0, 0.95, 0.82) * 1.7;
    // foam line at the horizon
    col = mix(col, foamCol, smoothstep(0.018, 0.0, abs(uv.y - horizon)) * 0.5);
  }

  // grain + vignette
  col += (hash(uv * u_res + t) - 0.5) * 0.035;
  col *= mix(0.80, 1.0, smoothstep(1.25, 0.30, distance(uv, vec2(0.5))));

  gl_FragColor = vec4(col, 1.0);
}
`;

export function WebGLBeach({ className = "", onUnsupported }) {
  const canvasRef = useRef(null);
  // Keep the latest callback in a ref so the GL context inits exactly once,
  // regardless of how often the parent re-renders.
  const onUnsupportedRef = useRef(onUnsupported);
  onUnsupportedRef.current = onUnsupported;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fail = () => onUnsupportedRef.current?.();

    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power", premultipliedAlpha: false })
      || canvas.getContext("experimental-webgl");
    if (!gl) { fail(); return; }

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);

    let program, locRes, locTime, locPtr, locReduced, raf = 0, start = performance.now();
    const ptr = { x: 0, y: 0, tx: 0, ty: 0 };

    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("WebGLBeach shader error:", gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    };

    const init = () => {
      const vs = compile(gl.VERTEX_SHADER, VERT);
      const fs = compile(gl.FRAGMENT_SHADER, FRAG);
      if (!vs || !fs) { fail(); return false; }
      program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { fail(); return false; }
      gl.useProgram(program);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(program, "a_pos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      locRes = gl.getUniformLocation(program, "u_res");
      locTime = gl.getUniformLocation(program, "u_time");
      locPtr = gl.getUniformLocation(program, "u_ptr");
      locReduced = gl.getUniformLocation(program, "u_reduced");
      gl.uniform1f(locReduced, reduced ? 1.0 : 0.0);
      return true;
    };

    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const draw = (nowMs) => {
      resize();
      ptr.x += (ptr.tx - ptr.x) * 0.05;
      ptr.y += (ptr.ty - ptr.y) * 0.05;
      gl.uniform2f(locRes, canvas.width, canvas.height);
      gl.uniform1f(locTime, (nowMs - start) / 1000);
      gl.uniform2f(locPtr, ptr.x, ptr.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (nowMs) => {
      if (!document.hidden) draw(nowMs);
      raf = requestAnimationFrame(loop);
    };

    const onPointer = (e) => {
      if (reduced) return;
      ptr.tx = (e.clientX / window.innerWidth) * 2 - 1;
      ptr.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onLost = (e) => { e.preventDefault(); cancelAnimationFrame(raf); raf = 0; };
    const onRestored = () => { if (init()) { reduced ? draw(performance.now()) : (raf = requestAnimationFrame(loop)); } };

    canvas.addEventListener("webglcontextlost", onLost, false);
    canvas.addEventListener("webglcontextrestored", onRestored, false);

    if (!init()) return;
    const ro = new ResizeObserver(() => { if (reduced) draw(performance.now()); });
    ro.observe(canvas);
    if (!reduced) window.addEventListener("pointermove", onPointer, { passive: true });

    if (reduced) { resize(); draw(performance.now()); }
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={`block w-full h-full ${className}`} />;
}
