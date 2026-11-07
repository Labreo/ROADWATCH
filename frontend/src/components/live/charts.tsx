'use client';

import { money } from './ui';

export function LineChart({ points, min, max, threshold, xLabels, color = 'var(--signal-cyan)', height = 220, label }: {
  points: number[]; min: number; max: number; threshold?: number; xLabels?: string[];
  color?: string; height?: number; label: string;
}) {
  const W = 800, H = height, L = 40, R = 10, T = 10, B = 26;
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(points.length - 1, 1);
  const y = (v: number) => T + (H - T - B) * (1 - (v - min) / (max - min || 1));
  const line = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => min + (max - min) * f);
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${W} ${H}`} className="w-full">
      {ticks.map(t => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--border-bright)" />
          <text x={0} y={y(t) + 4} fontSize="11" fill="var(--fg-dim)" fontFamily="monospace">{Math.round(t)}</text>
        </g>
      ))}
      {threshold !== undefined && (
        <line x1={L} x2={W - R} y1={y(threshold)} y2={y(threshold)} stroke="var(--signal-rose)" strokeDasharray="6 5" />
      )}
      {points.length > 0 && (
        <>
          <path d={`${line}L${x(points.length - 1)} ${H - B}L${L} ${H - B}Z`} fill={color} fillOpacity={0.1} />
          <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        </>
      )}
      {xLabels?.map((text, i) => (
        <text
          key={`${text}-${i}`}
          x={L + (i * (W - L - R)) / Math.max(xLabels.length - 1, 1)}
          y={H - 6}
          fontSize="11"
          fill="var(--fg-dim)"
          fontFamily="monospace"
          textAnchor={i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'}
        >
          {text}
        </text>
      ))}
    </svg>
  );
}

export interface Flow {
  source_name: string;
  authority: string;
  contractor: string;
  amount: number | string;
}

const PALETTE = ['#22d3ee', '#818cf8', '#34d399', '#f59e0b', '#f43f5e', '#94a3b8'];

/** Three-stage Sankey: fund source, then authority, then contractor. */
export function SankeyChart({ flows }: { flows: Flow[] }) {
  const W = 860, NW = 14, GAP = 14, TOP = 24, LABEL = 150;
  const X = [LABEL, W / 2 - NW / 2, W - LABEL - NW];
  const sum = (key: keyof Flow) => {
    const totals = new Map<string, number>();
    for (const f of flows) totals.set(String(f[key]), (totals.get(String(f[key])) ?? 0) + Number(f.amount));
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  };
  const columns = [sum('source_name'), sum('authority'), sum('contractor')];
  const total = columns[0].reduce((acc, [, v]) => acc + v, 0) || 1;
  const maxNodes = Math.max(...columns.map(c => c.length));
  // Keep room for each node's two-line label however small its value is.
  const H = Math.max(420, TOP + maxNodes * 44);
  const k = (H - TOP - GAP * (maxNodes - 1) - maxNodes * 2) / total;

  const place = (column: [string, number][]) => {
    let y = TOP;
    const map = new Map<string, { y: number; h: number; inY: number; outY: number; color: string }>();
    column.forEach(([name, value], i) => {
      const h = Math.max(value * k, 2);
      map.set(name, { y, h, inY: y, outY: y, color: PALETTE[i % PALETTE.length] });
      y += h + GAP;
    });
    return map;
  };
  const nodes = columns.map(place);

  const links: { x0: number; x1: number; y0: number; y1: number; h: number; color: string; id: string }[] = [];
  const addLinks = (stage: 0 | 1, fromKey: keyof Flow, toKey: keyof Flow) => {
    const grouped = new Map<string, number>();
    for (const f of flows) {
      const id = `${f[fromKey]}|${f[toKey]}`;
      grouped.set(id, (grouped.get(id) ?? 0) + Number(f.amount));
    }
    for (const [id, value] of grouped) {
      const [from, to] = id.split('|');
      const a = nodes[stage].get(from);
      const b = nodes[stage + 1].get(to);
      if (!a || !b) continue;
      const h = value * k;
      links.push({ x0: X[stage] + NW, x1: X[stage + 1], y0: a.outY, y1: b.inY, h, color: a.color, id: `${stage}-${id}` });
      a.outY += h;
      b.inY += h;
    }
  };
  addLinks(0, 'source_name', 'authority');
  addLinks(1, 'authority', 'contractor');

  return (
    <svg role="img" aria-label="Flow of public funds from sources to authorities to contractors" viewBox={`0 0 ${W} ${H}`} className="w-full">
      {['FUND SOURCE', 'AUTHORITY', 'CONTRACTOR'].map((text, i) => (
        <text key={text} x={i === 0 ? 0 : i === 1 ? W / 2 : W} y={10} fontSize="10" fill="var(--fg-dim)" fontFamily="monospace"
          textAnchor={i === 0 ? 'start' : i === 1 ? 'middle' : 'end'}>{text}</text>
      ))}
      {links.map(l => {
        const mid = (l.x0 + l.x1) / 2;
        return (
          <path
            key={l.id}
            d={`M${l.x0} ${l.y0}C${mid} ${l.y0} ${mid} ${l.y1} ${l.x1} ${l.y1}V${l.y1 + l.h}C${mid} ${l.y1 + l.h} ${mid} ${l.y0 + l.h} ${l.x0} ${l.y0 + l.h}Z`}
            fill={l.color}
            fillOpacity={0.22}
          />
        );
      })}
      {nodes.map((column, c) =>
        [...column.entries()].map(([name, n]) => {
          const value = columns[c].find(([key]) => key === name)?.[1] ?? 0;
          const textX = c === 0 ? 0 : c === 1 ? X[1] + NW + 6 : X[2] + NW + 8;
          const shortName = name.length > 24 ? `${name.slice(0, 23)}…` : name;
          return (
            <g key={`${c}-${name}`}>
              <rect x={X[c]} y={n.y} width={NW} height={n.h} rx={2} fill={n.color} />
              <text x={textX} y={n.y + n.h / 2 - 2} fontSize="12" fill="var(--foreground)">{shortName}</text>
              <text x={textX} y={n.y + n.h / 2 + 12} fontSize="11" fill="var(--fg-dim)" fontFamily="monospace">{money(value)}</text>
            </g>
          );
        }),
      )}
    </svg>
  );
}

/** Radar chart. Each axis value runs from 0 to 1. */
export function RadarChart({ axes, series, label }: {
  axes: string[];
  series: { name: string; color: string; values: number[] }[];
  label: string;
}) {
  const S = 300, C = S / 2, R = 104;
  const point = (i: number, v: number) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
    return [C + R * v * Math.cos(angle), C + R * v * Math.sin(angle)] as const;
  };
  const shape = (values: number[]) => `M${values.map((v, i) => point(i, Math.min(Math.max(v, 0), 1)).map(n => n.toFixed(1)).join(' ')).join('L')}Z`;
  return (
    <figure>
      <svg role="img" aria-label={label} viewBox={`-50 0 ${S + 100} ${S}`} className="mx-auto w-full max-w-[340px]">
        {[0.33, 0.66, 1].map(ring => <path key={ring} d={shape(axes.map(() => ring))} fill="none" stroke="var(--border-bright)" />)}
        {axes.map((axis, i) => {
          const [x, y] = point(i, 1);
          const [tx, ty] = point(i, 1.18);
          return (
            <g key={axis}>
              <line x1={C} y1={C} x2={x} y2={y} stroke="var(--border-bright)" />
              <text x={tx} y={ty + 4} fontSize="11" fill="var(--fg-dim)" textAnchor={Math.abs(tx - C) < 12 ? 'middle' : tx > C ? 'start' : 'end'}>{axis}</text>
            </g>
          );
        })}
        {series.map(s => <path key={s.name} d={shape(s.values)} fill={s.color} fillOpacity={0.18} stroke={s.color} strokeWidth={2} />)}
      </svg>
      <figcaption className="mt-1 flex justify-center gap-4 text-xs text-[var(--fg-dim)]">
        {series.map(s => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
