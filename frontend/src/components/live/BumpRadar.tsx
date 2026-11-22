'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, Play, Radio, Square } from 'lucide-react';
import { apiGet, apiPost, useLive } from '@/services/api';
import { BumpDetector, DETECTOR, MotionSample, Shock, syntheticRide } from '@/services/bumpDetector';
import { refreshLiveData } from '@/services/liveData';
import { Badge, Card, Kpi, KpiRow, Mono } from './ui';
import type { Cluster } from './BumpMap';

const BumpMap = dynamic(() => import('./BumpMap'), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-[var(--surface-2)]" /> });

interface Clusters { clusters: Cluster[]; totals: { hits: number; rides: number }; rule: { eps_m: number; min_hits: number; min_rides: number } }
interface Hit { lat: number; lon: number; intensity: number; speed_kmh: number | null; at: number }
interface NewReport { id: number; road_name: string | null; hits: number; rides: number }

const CHART_POINTS = 240;

/** Live trace of vertical shock with the detector's moving threshold. */
function ShockChart({ trace, threshold }: { trace: number[]; threshold: number }) {
  const w = 600, h = 140, mid = h / 2, scale = mid / 20;
  const path = trace.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (CHART_POINTS - 1)) * w},${mid - Math.max(-20, Math.min(20, v)) * scale}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-36 w-full" role="img" aria-label="Vertical shock over the last few seconds">
      <rect width={w} height={h} fill="var(--surface-2)" />
      {[threshold, -threshold].map(t => (
        <line key={t} x1={0} x2={w} y1={mid - t * scale} y2={mid - t * scale} stroke="#f59e0b" strokeDasharray="6 4" strokeWidth={1} />
      ))}
      <line x1={0} x2={w} y1={mid} y2={mid} stroke="var(--border-bright)" />
      <path d={path} fill="none" stroke="#22d3ee" strokeWidth={1.6} />
      <text x={6} y={14} fill="#f59e0b" fontSize={11}>threshold ±{threshold.toFixed(1)} m/s²</text>
    </svg>
  );
}

export default function BumpRadar() {
  const clusters = useLive<Clusters>('/screens/bumps/clusters', 15000);
  const [mode, setMode] = useState<'idle' | 'live' | 'replay'>('idle');
  const [trace, setTrace] = useState<number[]>(() => Array(CHART_POINTS).fill(0));
  const [threshold, setThreshold] = useState(DETECTOR.floor);
  const [hits, setHits] = useState<Hit[]>([]);
  const [trail, setTrail] = useState<[number, number][]>([]);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [reports, setReports] = useState<NewReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [replays, setReplays] = useState(0);

  const rideId = useRef<string>('');
  const queue = useRef<Hit[]>([]);
  const fix = useRef<{ lat: number; lon: number; speed: number | null } | null>(null);
  const detector = useRef<BumpDetector | null>(null);
  const traceBuf = useRef<number[]>(Array(CHART_POINTS).fill(0));
  const stoppers = useRef<(() => void)[]>([]);

  const upload = useCallback(async () => {
    const batch = queue.current.splice(0);
    if (batch.length === 0) return;
    try {
      const res = await apiPost<{ new_reports: NewReport[] }>('/screens/bumps', {
        ride_id: rideId.current,
        bumps: batch.map(({ lat, lon, intensity, speed_kmh }) => ({ lat, lon, intensity, speed_kmh })),
      });
      if (res.new_reports.length) {
        setReports(r => [...res.new_reports, ...r]);
        refreshLiveData();
      }
      clusters.reload();
    } catch (err) {
      queue.current.unshift(...batch); // keep them for the next try
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  }, [clusters]);

  const onShock = useCallback((shock: Shock) => {
    const at = fix.current;
    if (!at) return;
    const hit = { lat: at.lat, lon: at.lon, intensity: Math.round(shock.intensity * 10) / 10, speed_kmh: at.speed, at: Date.now() };
    queue.current.push(hit);
    setHits(h => [hit, ...h].slice(0, 30));
    if (navigator.vibrate) navigator.vibrate(60);
  }, []);

  const pushSample = useCallback((s: MotionSample) => {
    detector.current?.push(s);
    traceBuf.current.push(detector.current?.vertical ?? 0);
    traceBuf.current.shift();
  }, []);

  // Repaint the chart at 20 fps rather than on every sensor sample.
  useEffect(() => {
    if (mode === 'idle') return;
    const timer = setInterval(() => {
      setTrace([...traceBuf.current]);
      setThreshold(detector.current?.threshold ?? DETECTOR.floor);
    }, 50);
    return () => clearInterval(timer);
  }, [mode]);

  const stop = useCallback(async () => {
    stoppers.current.forEach(f => f());
    stoppers.current = [];
    detector.current?.flush();
    setMode('idle');
    await upload();
  }, [upload]);

  useEffect(() => () => stoppers.current.forEach(f => f()), []);

  const begin = (requireSpeed: boolean) => {
    rideId.current = crypto.randomUUID();
    detector.current = new BumpDetector(onShock, requireSpeed);
    traceBuf.current = Array(CHART_POINTS).fill(0);
    setTrail([]);
    setHits([]);
    setError(null);
    const uploader = setInterval(upload, 8000);
    stoppers.current.push(() => clearInterval(uploader));
  };

  /** Real ride: phone accelerometer + GPS. */
  const startLive = async () => {
    if (!window.isSecureContext) {
      setError('Motion sensors need a secure page. On the phone, open the app over https (or the ROADWATCH mobile app), not a plain http LAN address.');
      return;
    }
    const motion = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof motion.requestPermission === 'function' && (await motion.requestPermission()) !== 'granted') {
      setError('Motion access was not allowed.');
      return;
    }
    if (!navigator.geolocation) {
      setError('This device cannot share its location.');
      return;
    }
    begin(true);
    let got = false;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x === null) return;
      got = true;
      const r = e.rotationRate;
      pushSample({
        t: e.timeStamp, ax: a.x ?? 0, ay: a.y ?? 0, az: a.z ?? 0,
        rotation: r ? Math.hypot(r.alpha ?? 0, r.beta ?? 0, r.gamma ?? 0) : 0,
        speedKmh: fix.current?.speed ?? null,
      });
    };
    window.addEventListener('devicemotion', onMotion);
    const watch = navigator.geolocation.watchPosition(
      pos => {
        if (pos.coords.accuracy > 40) return;
        const kmh = pos.coords.speed !== null ? pos.coords.speed * 3.6 : null;
        fix.current = { lat: pos.coords.latitude, lon: pos.coords.longitude, speed: kmh };
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setSpeed(kmh);
        setTrail(t => [...t, [pos.coords.latitude, pos.coords.longitude] as [number, number]].slice(-500));
      },
      () => setError('Allow location access so shocks can be placed on the map.'),
      { enableHighAccuracy: true, maximumAge: 1000 },
    );
    const noSensor = setTimeout(() => { if (!got) setError('No motion sensor data. Use a phone, or try "Replay a ride".'); }, 3000);
    stoppers.current.push(() => window.removeEventListener('devicemotion', onMotion), () => navigator.geolocation.clearWatch(watch), () => clearTimeout(noSensor));
    setMode('live');
  };

  /** Demo without a phone: a synthetic ride along a real road, run through the same detector. */
  const startReplay = async () => {
    let coords: [number, number][];
    try {
      coords = (await apiGet<{ coordinates: [number, number][] }>('/screens/bumps/demo-route')).coordinates;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the demo road.');
      return;
    }
    begin(false);
    const duration = 14000;
    const samples = syntheticRide(duration, [0.38, 0.72], Math.random());
    const along = (f: number): [number, number] => {
      const seg = Math.min(coords.length - 2, Math.floor(f * (coords.length - 1)));
      const local = f * (coords.length - 1) - seg;
      const [x1, y1] = coords[seg], [x2, y2] = coords[seg + 1];
      return [y1 + (y2 - y1) * local, x1 + (x2 - x1) * local];
    };
    let i = 0;
    const started = performance.now();
    const timer = setInterval(() => {
      const elapsed = performance.now() - started;
      while (i < samples.length && samples[i].t <= elapsed) {
        const [lat, lon] = along(samples[i].t / duration);
        // GPS noise of a few metres, like a real phone.
        fix.current = { lat: lat + (Math.random() - 0.5) * 0.00004, lon: lon + (Math.random() - 0.5) * 0.00004, speed: samples[i].speedKmh ?? null };
        pushSample(samples[i]);
        i++;
      }
      const here = along(Math.min(1, elapsed / duration));
      setPosition(here);
      setSpeed(fix.current?.speed ?? null);
      setTrail(t => [...t, here].slice(-400));
      if (i >= samples.length) {
        setReplays(n => n + 1);
        stop();
      }
    }, 50);
    stoppers.current.push(() => clearInterval(timer));
    setMode('replay');
  };

  const list = clusters.data?.clusters ?? [];
  const confirmed = list.filter(c => c.confirmed).length;
  const rule = clusters.data?.rule;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]"><Radio className="h-5 w-5 text-[var(--signal-cyan)]" aria-hidden /> Bump Radar</h1>
          <p className="max-w-2xl text-[13px] text-[var(--fg-dim)]">
            Put your phone in your pocket or on the dashboard and ride. Its accelerometer feels every pothole you hit; GPS marks where.
            When {rule?.min_hits ?? 3} shocks from {rule?.min_rides ?? 2} separate rides land within {rule?.eps_m ?? 15} m, the database files a report and routes it to the ward. No photo, no typing.
          </p>
        </div>
        <div className="flex gap-2">
          {mode === 'idle' ? (
            <>
              <button onClick={startLive} className="inline-flex items-center gap-1.5 rounded-md bg-[var(--signal-cyan)] px-3 py-2 text-[13px] font-medium text-[#04161a]">
                <Activity className="h-4 w-4" aria-hidden /> Start a ride
              </button>
              <button onClick={startReplay} className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-bright)] px-3 py-2 text-[13px] text-[var(--foreground)]">
                <Play className="h-4 w-4" aria-hidden /> Replay a ride{replays > 0 ? ` (${replays + 1})` : ''}
              </button>
            </>
          ) : (
            <button onClick={stop} className="inline-flex items-center gap-1.5 rounded-md bg-rose-500 px-3 py-2 text-[13px] font-medium text-white">
              <Square className="h-4 w-4" aria-hidden /> Stop {mode === 'replay' ? 'replay' : 'ride'}
            </button>
          )}
        </div>
      </div>

      {error && <p role="alert" className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-200">{error}</p>}

      {reports.map(r => (
        <p key={r.id} role="status" className="rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-[13px] text-rose-100">
          <strong>Report #{r.id} filed automatically</strong> for {r.road_name ?? 'an unmapped street'}: {r.hits} shocks from {r.rides} rides agreed. It is routed to the ward and on the map.
        </p>
      ))}

      <KpiRow>
        <Kpi title="THIS RIDE" value={hits.length} note="shocks detected" tone="amber" />
        <Kpi title="SPEED" value={speed !== null ? `${Math.round(speed)} km/h` : '—'} note={mode === 'live' ? 'from GPS' : mode === 'replay' ? 'replay' : 'not riding'} />
        <Kpi title="SPOTS FOUND" value={list.length} note={`${clusters.data?.totals.hits ?? 0} shocks, ${clusters.data?.totals.rides ?? 0} rides (30 days)`} />
        <Kpi title="CONFIRMED" value={confirmed} tone="rose" note="became reports" />
      </KpiRow>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card title="Map" flush className="min-h-[360px]">
          <div className="h-[360px]"><BumpMap clusters={list} trail={trail} position={position} /></div>
        </Card>
        <div className="flex flex-col gap-4">
          <Card title="Vertical shock" right={mode !== 'idle' ? <Badge tone="emerald">live</Badge> : <Badge>idle</Badge>} flush>
            <ShockChart trace={trace} threshold={threshold} />
          </Card>
          <Card title="Shocks this ride" flush>
            {hits.length === 0 ? (
              <p className="p-4 text-[13px] text-[var(--fg-dim)]">None yet. Smooth roads stay quiet: the bar rises with normal road noise.</p>
            ) : (
              <ul className="max-h-48 divide-y divide-[var(--border-bright)] overflow-y-auto">
                {hits.map(h => (
                  <li key={h.at + h.lat} className="flex justify-between px-4 py-2 text-[13px] text-[var(--foreground)]">
                    <span><Mono tone="amber">{h.intensity} m/s²</Mono></span>
                    <span className="text-xs text-[var(--fg-dim)]">{h.lat.toFixed(5)}, {h.lon.toFixed(5)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card title="Spots under watch" flush>
        {list.length === 0 ? <p className="p-4 text-[13px] text-[var(--fg-dim)]">No shocks recorded yet.</p> : (
          <ul className="divide-y divide-[var(--border-bright)]">
            {list.map(c => (
              <li key={`${c.cluster}-${c.lat}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[13px] text-[var(--foreground)]">
                <span>
                  {c.road_name ?? 'Unmapped street'} <span className="text-xs text-[var(--fg-dim)]">· {c.authority ?? 'ward unknown'}</span>
                </span>
                <span className="flex items-center gap-2 text-xs text-[var(--fg-dim)]">
                  {c.hits} shocks · {c.rides} rides · peak {c.peak_intensity} m/s²
                  {c.confirmed ? <Badge tone="rose">{c.complaint_id ? `report #${c.complaint_id}` : 'confirmed'}</Badge> : <Badge tone="amber">{c.rides < (rule?.min_rides ?? 2) ? `needs ${(rule?.min_rides ?? 2) - c.rides} more ride(s)` : `needs ${(rule?.min_hits ?? 3) - c.hits} more shock(s)`}</Badge>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
