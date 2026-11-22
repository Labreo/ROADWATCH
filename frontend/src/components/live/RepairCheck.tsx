'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2, MapPin } from 'lucide-react';
import { API_BASE, authHeaders } from '@/services/api';

interface Verdict {
  verdict: 'repaired' | 'not_repaired' | 'too_far' | 'unclear';
  message: string; distance_m: number; observation?: string; confidence?: number; followup_id?: number;
}

const TONE: Record<Verdict['verdict'], string> = {
  repaired: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  not_repaired: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
  too_far: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  unclear: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
};

const TITLE: Record<Verdict['verdict'], string> = {
  repaired: 'Repair confirmed',
  not_repaired: 'Not repaired: report reopened',
  too_far: 'Too far from the spot',
  unclear: 'Photo unclear',
};

/**
 * Proof of repair. The photo has to be taken now, on site: the camera opens directly
 * (no gallery), and the phone's GPS position must be within 50 m of the report.
 */
export default function RepairCheck({ reportId, onDone }: { reportId: number; onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<'idle' | 'locating' | 'checking'>('idle');
  const [result, setResult] = useState<Verdict | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locate = () => new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('This device cannot share its location.'));
    navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('Allow location access: the check needs to know you are at the spot.')),
      { enableHighAccuracy: true, timeout: 15000 });
  });

  const check = async (file: File) => {
    setError(null);
    setResult(null);
    try {
      setStage('locating');
      const position = await locate();
      setStage('checking');
      const body = new FormData();
      body.append('photo', file);
      body.append('latitude', String(position.coords.latitude));
      body.append('longitude', String(position.coords.longitude));
      const res = await fetch(`${API_BASE}/screens/me/reports/${reportId}/verify-repair`, { method: 'POST', body, headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'The check failed.');
      setResult(data);
      if (data.verdict === 'not_repaired' || data.verdict === 'repaired') onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The check failed.');
    } finally {
      setStage('idle');
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="mt-3 rounded-md border border-[var(--border-bright)] bg-[var(--surface-2)] p-3">
      <p className="text-[13px] font-medium text-[var(--foreground)]">Was it really fixed?</p>
      <p className="mt-0.5 text-xs text-[var(--fg-dim)]">
        Stand at the spot and take a photo. Your location must be within 50 m. If the damage is still there, the report reopens at top priority.
      </p>
      <input
        ref={input} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) check(f); }}
        aria-label="Take a photo of the repaired spot"
      />
      <button
        onClick={() => input.current?.click()}
        disabled={stage !== 'idle'}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[var(--signal-cyan)] px-3 py-1.5 text-xs font-medium text-[#04161a] disabled:opacity-60"
      >
        {stage === 'idle' && <><Camera className="h-3.5 w-3.5" aria-hidden /> Check the repair on site</>}
        {stage === 'locating' && <><MapPin className="h-3.5 w-3.5 animate-pulse" aria-hidden /> Checking your location…</>}
        {stage === 'checking' && <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Looking at the photo…</>}
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-[var(--signal-rose)]">{error}</p>}
      {result && (
        <div role="status" className={`mt-2 rounded-md border px-3 py-2 text-xs ${TONE[result.verdict]}`}>
          <p className="font-semibold">{TITLE[result.verdict]} · {Math.round(result.distance_m)} m from the spot</p>
          <p className="mt-0.5">{result.message}</p>
          {result.observation && <p className="mt-1 opacity-80">AI saw: {result.observation}</p>}
        </div>
      )}
    </div>
  );
}
