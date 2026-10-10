import { useEffect, useRef, useState } from "react";

type Phase = "sleeping" | "waking" | "awake" | "resetting";
type Vec = { x: number; y: number; z: number };
type LightPointer = Vec & { weight: number };
type Dot = { x: number; y: number; z: number; radius: number; light: number };

// Visual controls: changing these preserves the geometry and lighting relationship.
const SETTINGS = {
  wakeSeconds: 4.8,
  resetSeconds: 1.45,
  turnSpeed: 0.065,     // radians per second; independent of display refresh rate
  lightSpeed: 0.30,
  dotSize: 0.019,
  latitudes: 23,
  longitudes: 30,
};
const TAU = Math.PI * 2;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (v: number) => { const t = clamp(v); return t * t * t * (t * (t * 6 - 15) + 10); };
const normalize = (v: Vec): Vec => {
  const m = Math.hypot(v.x, v.y, v.z);
  return { x: v.x / m, y: v.y / m, z: v.z / m };
};
const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y + a.z * b.z;
const sphereRadius = (width: number, height: number) => Math.min(width * 0.37, height * 0.36, 330);

// Unproject the cursor with the SAME camera as the particle projection.
function surfaceUnderPointer(x: number, y: number): Vec {
  const length = Math.hypot(x, y), limit = 0.94;
  if (length > limit) { x *= limit / length; y *= limit / length; }
  const camera = 4.4, c2 = camera * camera, r2 = x * x + y * y;
  const distance = (c2 - Math.sqrt(c2 - (c2 - 1) * r2)) / (c2 + r2);
  return normalize({ x: x * distance, y: y * distance, z: camera * (1 - distance) });
}

// Latitude rows make the direction of rotation legible. Each dot retains its ID.
const POINTS: Vec[] = [];
for (let row = 1; row < SETTINGS.latitudes; row++) {
  const latitude = Math.PI * row / SETTINGS.latitudes;
  // Fewer samples near the poles avoid a solid, overexposed cap.
  const count = Math.max(8, Math.round(SETTINGS.longitudes * Math.pow(Math.sin(latitude), 0.35)));
  for (let col = 0; col < count; col++) {
    const longitude = TAU * (col + (row % 2) * 0.5) / count;
    POINTS.push({ x: Math.sin(latitude) * Math.cos(longitude), y: -Math.cos(latitude), z: Math.sin(latitude) * Math.sin(longitude) });
  }
}

function rotate(p: Vec, yaw: number, tilt: number, roll: number): Vec {
  const x = p.x * Math.cos(yaw) + p.z * Math.sin(yaw);
  const z = -p.x * Math.sin(yaw) + p.z * Math.cos(yaw);
  const y2 = p.y * Math.cos(tilt) - z * Math.sin(tilt);
  const z2 = p.y * Math.sin(tilt) + z * Math.cos(tilt);
  return { x: x * Math.cos(roll) - y2 * Math.sin(roll), y: x * Math.sin(roll) + y2 * Math.cos(roll), z: z2 };
}

function drawSeed(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number, opacity: number, press = 0) {
  if (opacity <= 0) return;
  const r = (3.5 + 0.35 * Math.sin(time * 0.85)) * (1 - 0.16 * press);
  ctx.globalAlpha = opacity;
  const light = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
  light.addColorStop(0, "rgba(227,240,242,.19)");
  light.addColorStop(0.28, "rgba(216,230,235,.07)");
  light.addColorStop(1, "rgba(216,230,235,0)");
  ctx.fillStyle = light;
  ctx.fillRect(cx - 14, cy - 14, 28, 28);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU);
  ctx.fillStyle = "#eaf0f0"; ctx.fill();
  ctx.globalAlpha = 1;
}

function drawGlobe(ctx: CanvasRenderingContext2D, width: number, height: number, unfold: number, yaw: number, lightTime: number, pointer: LightPointer) {
  const baseRadius = sphereRadius(width, height);
  const radius = lerp(3.5, baseRadius, unfold);
  const cx = width / 2, cy = height / 2;
  // Separate world-space area lights from the particle rotation. No random twinkle.
  const autonomous = normalize({ x: Math.cos(lightTime * SETTINGS.lightSpeed) * 0.92, y: -0.4 + Math.sin(lightTime * 0.19) * 0.42, z: 1.12 });
  const manual = surfaceUnderPointer(pointer.x, pointer.y);
  const follow = pointer.weight;
  const key = normalize({ x: lerp(autonomous.x, manual.x, follow), y: lerp(autonomous.y, manual.y, follow), z: lerp(autonomous.z, manual.z, follow) });
  const fill = normalize({ x: -0.85, y: 0.35, z: 0.65 });
  const ribbonAxis = normalize({ x: Math.cos(lightTime * 0.16 + 1.1), y: 0.48, z: Math.sin(lightTime * 0.16 + 1.1) });
  const tilt = 0.16;
  const roll = -0.075 + Math.sin(lightTime * 0.12) * 0.045;
  const opacity = smooth(unfold / 0.14);
  const dots: Dot[] = [];

  for (const point of POINTS) {
    const n = rotate(point, yaw, tilt, roll);
    const depth = (n.z + 1) * 0.5;
    const perspective = 4.4 / (4.4 - n.z * unfold);
    const front = smooth((n.z + 0.22) / 0.72);
    const diffuse = Math.max(0, dot(n, key));
    const reflected = Math.pow(diffuse, lerp(4, 8, follow));
    const fillLight = Math.max(0, dot(n, fill));
    // A broad travelling ribbon shares one continuous field across all particles.
    const ribbon = Math.exp(-Math.pow((dot(n, ribbonAxis) - 0.2 * Math.sin(lightTime * 0.23)) / 0.43, 2));
    // Mouse takes over the main highlight while the autonomous lights recede.
    // The ambient floor keeps the unlit half of the sphere readable.
    const illumination = 0.29 + lerp(0.32, 0.12, follow) * diffuse + lerp(0.21, 0.61, follow) * reflected
      + 0.09 * fillLight * (1 - 0.88 * follow) + 0.21 * ribbon * (1 - 0.94 * follow);
    // Luminance encodes depth once; alpha is reserved for the wake transition.
    const light = clamp(illumination * lerp(0.46, 1.05, front) + 0.035 * depth, 0.13, 1);
    dots.push({ x: cx + n.x * radius * perspective, y: cy + n.y * radius * perspective,
      z: n.z, radius: baseRadius * SETTINGS.dotSize * perspective * lerp(0.27, 1, unfold) * lerp(0.72, 1, front), light });
  }
  dots.sort((a, b) => a.z - b.z);
  ctx.globalAlpha = opacity;
  for (const p of dots) {
    // Most of the light is in a crisp dot. Only the brightest points receive a tiny halo.
    if (p.light > 0.81 && unfold > 0.55) {
      const halo = ctx.createRadialGradient(p.x, p.y, p.radius * 0.65, p.x, p.y, p.radius * 2.1);
      halo.addColorStop(0, `rgba(230,245,247,${(p.light - 0.81) * 0.28})`);
      halo.addColorStop(1, "rgba(230,245,247,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(p.x - p.radius * 2.1, p.y - p.radius * 2.1, p.radius * 4.2, p.radius * 4.2);
    }
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, TAU);
    ctx.fillStyle = `rgb(${Math.round(244 * p.light)},${Math.round(250 * p.light)},${Math.round(252 * p.light)})`;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const controlRef = useRef<{ wake: () => void; reset: () => void } | null>(null);
  const [phase, setPhase] = useState<Phase>("sleeping");

  useEffect(() => {
    const canvas = canvasRef.current!, root = rootRef.current!;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let phase: Phase = "sleeping", phaseTime = 0, time = 0, yaw = 0.3, unfold = 0;
    let resetFrom = 0, width = 1, height = 1, dpr = 1, last = performance.now(), raf = 0;
    const pointer: LightPointer = { x: 0, y: 0, z: 0, weight: 0 }, target = { x: 0, y: 0 };
    let pointerInside = false;
    function change(next: Phase) {
      phase = next; phaseTime = 0; root.dataset.phase = next; setPhase(next);
    }
    function render() {
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.fillStyle = "#050606"; ctx!.fillRect(0, 0, width, height);
      if (unfold > 0.001) drawGlobe(ctx!, width, height, unfold, yaw, time, pointer);
      drawSeed(ctx!, width / 2, height / 2, time, 1 - smooth(unfold / 0.16), phase === "waking" ? Math.sin(clamp(phaseTime / 0.22) * Math.PI) : 0);
      root.dataset.expansion = unfold.toFixed(3);
      root.dataset.lightMode = pointerInside ? "pointer" : "ambient";
    }
    function resize() {
      const box = root.getBoundingClientRect();
      width = box.width; height = box.height; dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      render();
    }
    function loop(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      if (!document.hidden) {
        phaseTime += dt;
        if (!reduced.matches) time += dt;
        if (phase === "waking") {
          unfold = reduced.matches ? 1 : smooth((phaseTime - 0.10) / (SETTINGS.wakeSeconds - 0.10));
          if (unfold >= 1) change("awake");
        } else if (phase === "resetting") {
          unfold = reduced.matches ? 0 : resetFrom * (1 - smooth(phaseTime / SETTINGS.resetSeconds));
          if (unfold <= 0) { yaw = 0.3; change("sleeping"); }
        }
        if (!reduced.matches) yaw += dt * SETTINGS.turnSpeed * smooth(unfold / 0.65);
        const blend = reduced.matches ? 1 : 1 - Math.exp(-dt * 10);
        pointer.x += (target.x - pointer.x) * blend; pointer.y += (target.y - pointer.y) * blend;
        const takeover = reduced.matches ? 1 : 1 - Math.exp(-dt * (pointerInside ? 9 : 3));
        pointer.weight += ((pointerInside ? 1 : 0) - pointer.weight) * takeover;
        render();
      }
      raf = requestAnimationFrame(loop);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(root);
    const onPointer = (e: PointerEvent) => {
      const box = root.getBoundingClientRect();
      // CSS pixels inside this preview; independent of the outer Make editor and DPR.
      const radius = sphereRadius(box.width, box.height);
      target.x = (e.clientX - box.left - box.width / 2) / radius;
      target.y = (e.clientY - box.top - box.height / 2) / radius;
      const distance = Math.hypot(target.x, target.y);
      if (distance > 0.94) { target.x *= 0.94 / distance; target.y *= 0.94 / distance; }
      pointerInside = true;
    };
    const onLeave = () => { pointerInside = false; };
    const onPointerUp = (e: PointerEvent) => { if (e.pointerType !== "mouse") onLeave(); };
    const onVisibility = () => { last = performance.now(); };
    root.addEventListener("pointermove", onPointer);
    root.addEventListener("pointerdown", onPointer);
    root.addEventListener("pointerup", onPointerUp);
    root.addEventListener("pointercancel", onLeave);
    root.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    controlRef.current = {
      wake() { if (phase === "sleeping") change("waking"); },
      reset() { if (phase === "sleeping" || phase === "resetting") return; pointerInside = false; resetFrom = unfold; change("resetting"); },
    };
    const preview=(e:MessageEvent)=>{if(e.origin===location.origin&&e.source===window.parent&&e.data?.type==="study-preview-start")controlRef.current?.wake();};window.addEventListener("message",preview);
    root.dataset.phase = "sleeping"; resize(); raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("message",preview);cancelAnimationFrame(raf); observer.disconnect(); controlRef.current = null;
      root.removeEventListener("pointermove", onPointer); root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerdown", onPointer); root.removeEventListener("pointerup", onPointerUp);
      root.removeEventListener("pointercancel", onLeave); window.removeEventListener("blur", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <main ref={rootRef} className="particle-wake" aria-label="Wake 粒子球交互" role="button" tabIndex={0} aria-expanded={phase !== "sleeping" && phase !== "resetting"} onClick={() => phase === "sleeping" ? controlRef.current?.wake() : controlRef.current?.reset()} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (phase === "sleeping") controlRef.current?.wake(); else controlRef.current?.reset(); } }}>
      <canvas ref={canvasRef} aria-hidden="true" />
    {phase === "sleeping" && <span className="particle-wake-trigger" aria-hidden="true"><span>WAKE</span></span>}
      <span className="particle-wake-sr" role="status">{phase === "awake" ? "已唤醒" : phase === "sleeping" ? "休眠中，点击 Wake 唤醒" : phase === "waking" ? "正在唤醒" : "正在回到休眠"}</span>
      <style>{`
        .particle-wake{position:fixed;inset:0;width:100%;height:100dvh;min-height:240px;margin:0;padding:0;overflow:hidden;background:#050606;isolation:isolate;cursor:pointer;-webkit-tap-highlight-color:transparent}
        .particle-wake canvas{display:block;width:100%;height:100%;position:absolute;inset:0;pointer-events:none}
        .particle-wake button{font-family:ui-monospace,"SFMono-Regular",Consolas,monospace;font-weight:400;border:0;appearance:none;background:none;padding:0;outline:none;box-shadow:none}
        .particle-wake-trigger{pointer-events:none;position:absolute;left:50%;top:50%;width:112px;height:112px;transform:translate(-50%,-50%);border-radius:50%;cursor:pointer;color:#969d9e}
        .particle-wake-trigger span{position:absolute;left:0;right:0;top:90px;font-size:10px;line-height:18px;letter-spacing:.32em;padding-left:.32em;opacity:.75;transition:opacity .4s}
        .particle-wake-trigger:hover span{opacity:1}
        .particle-wake-trigger:disabled{cursor:default;pointer-events:none}
        .particle-wake-trigger:disabled span{opacity:0}
        .particle-wake button:focus-visible{outline:1px solid #bac9cd;outline-offset:5px;border-radius:2px}
        .particle-wake-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
        @media(prefers-reduced-motion:reduce){.particle-wake *{transition:none!important}}
      `}</style>
    </main>
  );
}
