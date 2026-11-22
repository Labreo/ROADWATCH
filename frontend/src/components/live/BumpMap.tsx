'use client';

import { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';

/** Keep the rider in view; jump to the first spot when idle. */
function Follow({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target && !map.getBounds().pad(-0.2).contains(target)) map.setView(target, Math.max(map.getZoom(), 15), { animate: true });
  }, [map, target]);
  return null;
}

export interface Cluster {
  cluster: number; hits: number; rides: number; mean_intensity: number; peak_intensity: number;
  lat: number; lon: number; confirmed: boolean; road_name: string | null; authority: string | null; complaint_id: number | null;
}

/** Shock clusters on the city map: amber while gathering evidence, red once confirmed. */
export default function BumpMap({ clusters, trail, position }: {
  clusters: Cluster[]; trail: [number, number][]; position: [number, number] | null;
}) {
  const centre: [number, number] = position ?? (clusters[0] ? [clusters[0].lat, clusters[0].lon] : [19.07, 72.87]);
  // Add vector layers only once Leaflet has sized its renderer, or circles throw on first draw.
  const [ready, setReady] = useState(false);
  return (
    <MapContainer center={centre} zoom={13} className="h-full w-full" scrollWheelZoom whenReady={() => setReady(true)}>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
        className="dark-map-tiles"
      />
      {ready && <Follow target={position ?? (clusters[0] ? [clusters[0].lat, clusters[0].lon] : null)} />}
      {ready && trail.length > 1 && <Polyline positions={trail} pathOptions={{ color: '#22d3ee', weight: 4, opacity: 0.8 }} />}
      {ready && position && <CircleMarker center={position} radius={7} pathOptions={{ color: '#22d3ee', fillColor: '#22d3ee', fillOpacity: 1 }} />}
      {ready && clusters.map(c => (
        <CircleMarker
          key={`${c.cluster}-${c.lat}`}
          center={[c.lat, c.lon]}
          radius={6 + Math.min(c.hits, 10) * 1.5}
          pathOptions={{ color: c.confirmed ? '#f43f5e' : '#f59e0b', fillColor: c.confirmed ? '#f43f5e' : '#f59e0b', fillOpacity: 0.45 }}
        >
          <Popup>
            <strong>{c.confirmed ? 'Confirmed pothole' : 'Gathering evidence'}</strong><br />
            {c.road_name ?? 'Unmapped street'} · {c.authority ?? 'ward unknown'}<br />
            {c.hits} shocks from {c.rides} rides, peak {c.peak_intensity} m/s²
            {c.complaint_id ? <><br />Report #{c.complaint_id}</> : null}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
