/**
 * Pothole shock detector for a phone riding in a vehicle.
 *
 * 1. Gravity is tracked with a low-pass filter on accelerationIncludingGravity, so the
 *    phone can sit in any orientation (pocket, dashboard mount, handlebar).
 * 2. Each sample's vertical shock is the linear acceleration projected on that gravity
 *    direction: a_v = (a - g) . g/|g|.
 * 3. A shock counts when |a_v| exceeds both a floor and 4x the recent RMS road noise
 *    (so rough but even roads do not trigger), the phone is not being handled (high
 *    rotation rate), and the vehicle is moving. Hits closer than the refractory gap
 *    merge into one, keeping the peak.
 */
export interface MotionSample {
  t: number;                 // ms
  ax: number; ay: number; az: number;   // accelerationIncludingGravity, m/s²
  rotation?: number;         // |rotationRate|, deg/s
  speedKmh?: number | null;
}

export interface Shock { t: number; intensity: number; vertical: number }

export const DETECTOR = {
  gravityAlpha: 0.92,
  floor: 5.5,           // m/s², minimum vertical shock
  noiseFactor: 4,       // shock must beat this many times the running RMS
  noiseWindow: 120,     // samples (~2 s at 60 Hz)
  refractoryMs: 700,
  maxRotation: 250,     // deg/s, above this the phone is being handled
  minSpeedKmh: 8,
};

export class BumpDetector {
  private g: [number, number, number] | null = null;
  private window: number[] = [];
  private sumSq = 0;
  private pending: Shock | null = null;
  /** Last computed vertical acceleration, for the live chart. */
  vertical = 0;
  threshold: number = DETECTOR.floor;

  private onShock: (shock: Shock) => void;
  private requireSpeed: boolean;

  constructor(onShock: (shock: Shock) => void, requireSpeed = true) {
    this.onShock = onShock;
    this.requireSpeed = requireSpeed;
  }

  push(s: MotionSample) {
    const a: [number, number, number] = [s.ax, s.ay, s.az];
    if (!this.g) this.g = [...a];
    const k = DETECTOR.gravityAlpha;
    this.g = [k * this.g[0] + (1 - k) * a[0], k * this.g[1] + (1 - k) * a[1], k * this.g[2] + (1 - k) * a[2]];
    const gn = Math.hypot(...this.g) || 9.81;
    const v = ((a[0] - this.g[0]) * this.g[0] + (a[1] - this.g[1]) * this.g[1] + (a[2] - this.g[2]) * this.g[2]) / gn;
    this.vertical = v;

    const rms = this.window.length ? Math.sqrt(this.sumSq / this.window.length) : 0;
    this.threshold = Math.max(DETECTOR.floor, DETECTOR.noiseFactor * rms);
    const moving = !this.requireSpeed || (s.speedKmh ?? 0) >= DETECTOR.minSpeedKmh;
    const steady = (s.rotation ?? 0) < DETECTOR.maxRotation;

    if (Math.abs(v) > this.threshold && moving && steady) {
      if (this.pending && s.t - this.pending.t < DETECTOR.refractoryMs) {
        if (Math.abs(v) > this.pending.intensity) this.pending = { t: this.pending.t, intensity: Math.abs(v), vertical: v };
      } else {
        this.flush();
        this.pending = { t: s.t, intensity: Math.abs(v), vertical: v };
      }
    } else {
      // Only calm samples feed the noise estimate, so a pothole does not raise its own bar.
      this.window.push(v);
      this.sumSq += v * v;
      if (this.window.length > DETECTOR.noiseWindow) {
        const old = this.window.shift() as number;
        this.sumSq -= old * old;
      }
      if (this.pending && s.t - this.pending.t >= DETECTOR.refractoryMs) this.flush();
    }
  }

  flush() {
    if (this.pending) this.onShock(this.pending);
    this.pending = null;
  }
}

/** A recorded-style ride for demos: road texture noise plus two pothole impacts, at 60 Hz. */
export function syntheticRide(durationMs: number, potholesAt: number[], seed = Math.random()): MotionSample[] {
  let r = seed * 1e6;
  const rand = () => ((r = (r * 9301 + 49297) % 233280) / 233280) - 0.5;
  const out: MotionSample[] = [];
  const tilt = 0.35; // phone mounted at an angle: gravity spread over y and z
  for (let t = 0; t < durationMs; t += 1000 / 60) {
    let shock = rand() * 1.4 + Math.sin(t / 37) * 0.35;           // asphalt texture and engine
    for (const p of potholesAt) {
      const dt = t - p * durationMs + 500 / 60;                     // ms from impact, snapped to the nearest sample
      if (dt >= 0 && dt < 260) shock += -15 * Math.exp(-dt / 45) * Math.cos(dt / 18) * (0.85 + rand() * 0.3);
    }
    out.push({
      t,
      ax: rand() * 0.6,
      ay: 9.81 * Math.sin(tilt) + shock * Math.sin(tilt),
      az: 9.81 * Math.cos(tilt) + shock * Math.cos(tilt),
      rotation: Math.abs(rand()) * 40,
      speedKmh: 26 + rand() * 4,
    });
  }
  return out;
}
