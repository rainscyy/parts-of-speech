import { useEffect, useRef, useState } from "react";

type Phase = "sleeping" | "waking" | "awake" | "resetting";
const SETTINGS = { particles: 22000, wakeSeconds: 4.8, resetSeconds: 1.5, turnSpeed: 0.065 };
const clamp = (x: number, low = 0, high = 1) => Math.max(low, Math.min(high, x));
const smooth = (x: number) => { const t = clamp(x); return t*t*t*(t*(6*t-15)+10); };

// Persistent seeds form a thin spherical shell. They are never regenerated per frame.
function makeParticles() {
  const data = new Float32Array(SETTINGS.particles * 4);
  let seed = 93127;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < SETTINGS.particles; i++) {
    const latitude = i % 3 === 0 ? Math.PI * (0.007 + 0.986 * random()) : Math.acos(1 - 2 * random());
    data.set([latitude, Math.PI * 2 * random(), random(), random()], i * 4);
  }
  return data;
}

const VERTEX = `
precision highp float;
attribute vec4 aParticle;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform vec2 uCursor;
uniform float uScatter;
uniform float uRadius;
uniform float uDpr;
uniform float uOpen;
uniform float uYaw;
uniform float uTime;
varying float vOpacity;
void main(){
  float theta = aParticle.x;
  float seed = aParticle.z;
  float longitude = aParticle.y + uYaw * (0.88 + 0.15 * cos(theta * 2.0));
  longitude += 0.09 * sin(theta * 4.0 + uTime * 0.28) * uOpen;
  // Nearby points share a gently evolving flow; no frame-to-frame position noise.
  float polar = theta + sin(theta) * 0.018 * sin(longitude * 3.0 + uTime * 0.38);
  float shell = 1.0 + (seed - 0.5) * 0.026;
  shell += 0.008 * sin(longitude * 5.0 + theta * 3.0 + uTime * 0.42);
  shell += step(0.97, aParticle.w) * (seed - 0.4) * 0.06;
  vec3 n = vec3(sin(polar) * cos(longitude), cos(polar), sin(polar) * sin(longitude));
  float tilt = 0.08 + uPointer.y * 0.03;
  float cy = cos(tilt), sy = sin(tilt);
  n.yz = mat2(cy, sy, -sy, cy) * n.yz;
  float roll = 0.028 * sin(uTime * 0.12) + uPointer.x * 0.025;
  float cr = cos(roll), sr = sin(roll);
  n.xy = mat2(cr, sr, -sr, cr) * n.xy;
  float perspective = 6.0 / (6.0 - n.z * uOpen);
  float radius = mix(2.4, uRadius, uOpen);
  vec2 screen = n.xy * shell * radius * perspective;
  // A soft, uneven flow field scatters dust rather than carving a circular hole.
  vec2 delta = screen - uCursor;
  float reach = clamp(uRadius * 0.43, 52.0, 120.0);
  vec2 drift = vec2(sin(delta.y / reach * 2.8 + uTime * 0.45),
                    cos(delta.x / reach * 2.3 - uTime * 0.32)) * reach * 0.15;
  vec2 field = (delta + drift) * vec2(0.88, 1.12);
  float distanceToPointer = length(field);
  float influence = exp(-2.1 * dot(field, field) / (reach * reach)) * uScatter * uOpen;
  // Different dust grains yield by different amounts, keeping a feathered interior.
  float response = 0.12 + 0.88 * pow(aParticle.w, 1.7);
  vec2 direction = field / (distanceToPointer + reach * 0.32);
  vec2 tangent = vec2(-direction.y, direction.x);
  float curl = sin(seed * 19.0 + uTime * 0.65 + distanceToPointer / reach * 3.0);
  screen += (direction * reach * 1.05 + tangent * curl * reach * 0.38) * influence * response;
  gl_Position = vec4(screen / uResolution * 2.0, 0.0, 1.0);
  float pixelScale = clamp(uRadius / 180.0, 0.63, 1.6);
  float size = (0.78 + 1.30 * pow(aParticle.w, 2.5)) * pixelScale;
  size *= mix(0.83, 1.08, (n.z + 1.0) * 0.5) * perspective;
  gl_PointSize = max(0.7, size * uDpr * mix(0.34, 1.0, uOpen));
  // The reference has luminous poles and a quiet equator, not a uniform dotted surface.
  float pole = pow(abs(n.y), 2.6);
  float depth = mix(0.65, 1.0, smoothstep(-0.65, 0.8, n.z));
  float flowLight = 0.87 + 0.13 * sin(longitude * 2.0 - uTime * 0.24 + polar * 3.0);
  float density = 0.018 + 0.91 * pole;
  float visibility = smoothstep(seed - 0.07, seed + 0.07, density);
  float grain = 0.83 + 0.17 * aParticle.w;
  vOpacity = visibility * depth * flowLight * grain * smoothstep(0.015, 0.12, uOpen);
}
`;
const FRAGMENT = `
precision mediump float;
varying float vOpacity;
void main(){
  float distanceFromCenter = length(gl_PointCoord - vec2(0.5));
  float coverage = 1.0 - smoothstep(0.24, 0.50, distanceFromCenter);
  if(coverage <= 0.0) discard;
  gl_FragColor = vec4(vec3(1.0), vOpacity * coverage);
}
`;

function createRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: true, depth: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error("当前浏览器无法启动 WebGL，请打开硬件加速后重试。");
  const shaders: WebGLShader[] = [];
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!; shaders.push(shader);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || "Shader compilation failed");
    return shader;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "Program linking failed");
  const buffer = gl.createBuffer()!;
  gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, makeParticles(), gl.STATIC_DRAW);
  const attribute = gl.getAttribLocation(program, "aParticle");
  gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute, 4, gl.FLOAT, false, 0, 0);
  const resolution = gl.getUniformLocation(program, "uResolution");
  const pointer = gl.getUniformLocation(program, "uPointer");
  const cursor = gl.getUniformLocation(program, "uCursor");
  const scatter = gl.getUniformLocation(program, "uScatter");
  const radius = gl.getUniformLocation(program, "uRadius");
  const dpr = gl.getUniformLocation(program, "uDpr");
  const open = gl.getUniformLocation(program, "uOpen");
  const yaw = gl.getUniformLocation(program, "uYaw");
  const time = gl.getUniformLocation(program, "uTime");
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.disable(gl.DEPTH_TEST); gl.clearColor(0, 0, 0, 1);
  return {
    draw(width: number, height: number, ratio: number, amount: number, angle: number, seconds: number, px: number, py: number, cx: number, cy: number, strength: number) {
      gl.viewport(0, 0, canvas.width, canvas.height); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(resolution, width, height); gl.uniform2f(pointer, px, py);
      gl.uniform2f(cursor, cx, cy); gl.uniform1f(scatter, strength);
      gl.uniform1f(radius, Math.min(width * 0.29, height * 0.29, 305));
      gl.uniform1f(dpr, ratio); gl.uniform1f(open, amount); gl.uniform1f(yaw, angle); gl.uniform1f(time, seconds);
      if (amount > 0.001) gl.drawArrays(gl.POINTS, 0, SETTINGS.particles);
    },
    dispose() { gl.deleteBuffer(buffer); gl.deleteProgram(program); shaders.forEach(s => gl.deleteShader(s)); },
  };
}

export default function App() {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const seedRef = useRef<HTMLSpanElement>(null);
  const controlRef = useRef<{wake: () => void; reset: () => void} | null>(null);
  const [phase, setPhase] = useState<Phase>("sleeping");
  const [error, setError] = useState("");
  const [contextVersion, setContextVersion] = useState(0);

  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!, seed = seedRef.current!;
    let renderer: ReturnType<typeof createRenderer>;
    try { renderer = createRenderer(canvas); } catch (e) { setError(String(e)); return; }
    setError(""); setPhase("sleeping");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let phase: Phase = "sleeping", elapsed = 0, unfold = 0, from = 0;
    let time = 0, yaw = 0.25, last = performance.now(), raf = 0;
    let width = 1, height = 1, ratio = 1, px = 0, py = 0, tx = 0, ty = 0;
    let cursorX = 0, cursorY = 0, scatter = 0, scatterTarget = 0;
    const change = (next: Phase) => { phase = next; elapsed = 0; root.dataset.phase = next; setPhase(next); };
    const draw = () => {
      renderer.draw(width, height, ratio, unfold, yaw, time, px, py, cursorX, cursorY, scatter);
      seed.style.opacity = String(1 - smooth(unfold / 0.12));
      seed.style.transform = `translate(-50%,-50%) scale(${1 + 0.08 * Math.sin(time * 0.9)})`;
      root.dataset.scatter = scatter.toFixed(3);
      root.dataset.yaw = yaw.toFixed(4);
      root.dataset.expansion = unfold.toFixed(3);
    };
    const resize = () => {
      const box = root.getBoundingClientRect(); width = box.width; height = box.height;
      ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); draw();
    };
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      if (!document.hidden) {
        elapsed += dt;
        if (!reduced.matches) time += dt;
        if (phase === "waking") {
          unfold = reduced.matches ? 1 : smooth((elapsed - 0.08) / SETTINGS.wakeSeconds);
          if (unfold >= 1) change("awake");
        } else if (phase === "resetting") {
          unfold = reduced.matches ? 0 : from * (1 - smooth(elapsed / SETTINGS.resetSeconds));
          if (unfold <= 0) { yaw = 0.25; change("sleeping"); }
        }
        if (!reduced.matches) yaw += dt * SETTINGS.turnSpeed * smooth(unfold / 0.5);
        const blend = 1 - Math.exp(-dt * 3);
        if (reduced.matches) { px = 0; py = 0; }
        else { px += (tx-px)*blend; py += (ty-py)*blend; }
        scatter += ((reduced.matches ? 0 : scatterTarget) - scatter) * (1 - Math.exp(-dt * (scatterTarget ? 12 : 4)));
        draw();
      }
      raf = requestAnimationFrame(loop);
    };
    const move = (e: PointerEvent) => {
      if (reduced.matches) return;
      const box = root.getBoundingClientRect();
      cursorX = e.clientX - box.left - width / 2;
      cursorY = height / 2 - (e.clientY - box.top);
      scatterTarget = 1;
      tx = clamp((e.clientX-box.left-width/2)/width,-0.5,0.5);
      ty = clamp((e.clientY-box.top-height/2)/height,-0.5,0.5);
    };
    const leave = () => { tx = ty = 0; scatterTarget = 0; };
    const visibility = () => { last = performance.now(); };
    const lost = (e: Event) => { e.preventDefault(); cancelAnimationFrame(raf); setError("图形渲染暂时中断，正在等待恢复。"); };
    const restored = () => setContextVersion(v => v+1);
    controlRef.current = {
      wake() { if (phase === "sleeping") change("waking"); },
      reset() { if (phase === "sleeping" || phase === "resetting") return; from = unfold; change("resetting"); },
    };
    const observer = new ResizeObserver(resize); observer.observe(root);
    root.addEventListener("pointermove", move); root.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", visibility);
    canvas.addEventListener("webglcontextlost", lost); canvas.addEventListener("webglcontextrestored", restored);
    const preview=(e:MessageEvent)=>{if(e.origin===location.origin&&e.source===window.parent&&e.data?.type==="study-preview-start")controlRef.current?.wake();};window.addEventListener("message",preview);
    root.dataset.phase = "sleeping"; resize(); raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("message",preview);cancelAnimationFrame(raf); observer.disconnect(); renderer.dispose(); controlRef.current = null;
      root.removeEventListener("pointermove", move); root.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("webglcontextlost", lost); canvas.removeEventListener("webglcontextrestored", restored);
    };
  }, [contextVersion]);

  return <main ref={rootRef} className="dust-wake" aria-label="Wake 光尘球交互" role="button" tabIndex={0} aria-expanded={phase !== "sleeping" && phase !== "resetting"} onClick={() => phase === "sleeping" ? controlRef.current?.wake() : controlRef.current?.reset()} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (phase === "sleeping") controlRef.current?.wake(); else controlRef.current?.reset(); } }}>
    <canvas ref={canvasRef} aria-hidden="true" />
    <span ref={seedRef} className="dust-seed" aria-hidden="true" />
    {phase === "sleeping" && <span className="dust-trigger" aria-hidden="true"><span>WAKE</span></span>}
      <span className="dust-sr" role="status">{phase === "awake" ? "已唤醒" : phase === "sleeping" ? "休眠中，点击 Wake 唤醒" : phase === "waking" ? "正在唤醒" : "正在回到休眠"}</span>
    {error && <p className="dust-error" role="alert">{error}</p>}
    <style>{`
      .dust-wake{position:fixed;inset:0;width:100%;height:100dvh;min-height:240px;overflow:hidden;background:#000;margin:0;padding:0;isolation:isolate;cursor:pointer;-webkit-tap-highlight-color:transparent}
      .dust-wake canvas{position:absolute;inset:0;display:block;width:100%;height:100%;pointer-events:none}
      .dust-seed{position:absolute;top:50%;left:50%;width:5px;height:5px;border-radius:50%;background:#f5f5f5;box-shadow:0 0 9px #ffffff19;transform:translate(-50%,-50%);pointer-events:none}
      .dust-wake button{font-family:ui-monospace,"SFMono-Regular",Consolas,monospace;font-weight:400;border:0;appearance:none;background:none;padding:0;outline:none;box-shadow:none}
      .dust-trigger{pointer-events:none;position:absolute;left:50%;top:50%;width:112px;height:112px;transform:translate(-50%,-50%);border-radius:50%;cursor:pointer;color:#a7a7a7}
      .dust-trigger span{position:absolute;left:0;right:0;top:90px;font-size:10px;line-height:18px;letter-spacing:.32em;padding-left:.32em;opacity:.75;transition:opacity .4s}
      .dust-trigger:hover span{opacity:1}.dust-trigger:disabled{cursor:default;pointer-events:none}.dust-trigger:disabled span{opacity:0}
      .dust-wake button:focus-visible{outline:1px solid #bcc;outline-offset:5px;border-radius:2px}
      .dust-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
      .dust-error{position:absolute;bottom:90px;left:10%;width:80%;text-align:center;font:12px/1.7 system-ui;color:#a9a9a9}
      @media(prefers-reduced-motion:reduce){.dust-wake *{transition:none!important}}
    `}</style>
  </main>;
}
