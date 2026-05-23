'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '@/store/useStore';
import { roads, getComplaintsForRoad } from '@/data/mockData';
import { Road } from '@/types';
import { getHistoricalRoadState, playbackSteps } from '@/data/historicalData';
import { generateSensorsForRoads, generateStressZones, SENSOR_LEVEL_COLORS, SENSOR_COLORS, type SensorReading } from '@/data/sensorData';

// Swaps GeoJSON [longitude, latitude] to Leaflet [latitude, longitude]
const getLeafletCoords = (coords: [number, number][]): [number, number][] => {
  return coords.map(c => [c[1], c[0]]);
};

// Swaps GeoJSON point coordinates
const getLeafletPoint = (coords: [number, number]): [number, number] => {
  return [coords[1], coords[0]];
};

// Color codes based on road status — cinematic intelligence palette
const getStatusColor = (status: string, isSelected: boolean) => {
  if (isSelected) return '#e8e8f0';
  switch (status) {
    case 'good':              return '#34d399'; // Signal emerald
    case 'fair':              return '#f59e0b'; // Signal amber
    case 'poor':              return '#f43f5e'; // Signal rose
    case 'under_construction':return '#71717a'; // Muted zinc
    default:                  return '#3f3f46';
  }
};

// Generate underground utility line coordinates (offset from road geometry)
function getUtilityCoords(
  coords: [number, number][],
  offsetLat: number,
  offsetLng: number
): [number, number][] {
  return coords.map(c => [c[1] + offsetLat, c[0] + offsetLng] as [number, number]);
}

// Utility layer config
const UTILITY_LAYERS = [
  { key: 'water',    color: '#38bdf8', dashArray: '6 4', weight: 1.5, opacity: 0.5, offsetLat:  0.0004, offsetLng:  0.0003, label: 'Water Main' },
  { key: 'electric', color: '#fbbf24', dashArray: '3 5', weight: 1.2, opacity: 0.4, offsetLat: -0.0004, offsetLng: -0.0003, label: 'Electrical Conduit' },
  { key: 'fiber',    color: '#a78bfa', dashArray: '2 6', weight: 1.0, opacity: 0.35, offsetLat:  0.0008, offsetLng:  0.0002, label: 'Fiber Optic' },
];


// Helper component to center and animate map viewpoint changes
function MapController({ selectedRoad }: { selectedRoad: Road | null }) {
  const map = useMap();
  const { mapViewport } = useStore();

  useEffect(() => {
    if (mapViewport) {
      map.flyTo(mapViewport.center, mapViewport.zoom, {
        duration: 1.8,
        easeLinearity: 0.25
      });
    } else if (selectedRoad && selectedRoad.geometry.coordinates.length > 0) {
      // Find midpoint or bound fit
      const leafletCoords = getLeafletCoords(selectedRoad.geometry.coordinates);
      const bounds = L.latLngBounds(leafletCoords);
      map.flyToBounds(bounds, {
        padding: [50, 50],
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [selectedRoad, mapViewport, map]);

  return null;
}

// Custom HTML/Tailwind styling for markers to avoid missing asset paths
const createComplaintIcon = (category: string) => {
  let color = 'bg-red-500';
  if (category === 'waterlogging') color = 'bg-blue-500';
  if (category === 'paving_defect') color = 'bg-yellow-500';
  if (category === 'debris') color = 'bg-orange-600';
  if (category === 'missing_signage') color = 'bg-fuchsia-500';

  return L.divIcon({
    className: 'custom-marker-wrapper',
    html: `<div class="relative flex items-center justify-center w-5 h-5">
             <div class="absolute w-5 h-5 rounded-full ${color} opacity-40 animate-ping"></div>
             <div class="relative w-3.5 h-3.5 rounded-full ${color} border-2 border-slate-900 shadow-md"></div>
           </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const createSensorIcon = (level: SensorReading['level'], type: SensorReading['type']) => {
  const colors: Record<SensorReading['level'], string> = {
    nominal:  '52, 211, 153',
    elevated: '245, 158, 11',
    critical: '244, 63, 94'
  };
  const rgb = colors[level];
  return L.divIcon({
    className: 'sensor-marker-wrapper',
    html: `<div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center">
             <div style="position:absolute;width:20px;height:20px;border-radius:50%;background:rgba(${rgb},0.25);animation:ping 1.5s ease-out infinite"></div>
             <div style="width:10px;height:10px;border-radius:50%;background:rgba(${rgb},0.9);border:1.5px solid rgba(255,255,255,0.6);box-shadow:0 0 6px rgba(${rgb},0.8)"></div>
           </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

export default function LeafletMap() {
  const { 
    selectedRoadId, 
    setSelectedRoadId, 
    searchQuery, 
    statusFilter,
    activeView,
    currentPlaybackStepId
  } = useStore();

  // Generate sensors & stress zones once (stable deterministic values)
  const allSensors = generateSensorsForRoads(roads as any);
  const stressZones = generateStressZones(roads as any);

  // Find active road object
  const selectedRoad = roads.find(r => r.id === selectedRoadId) || null;

  // Active complaints for selected road, filtered by playback date if in timeline mode
  const baseComplaints = selectedRoad ? getComplaintsForRoad(selectedRoad.id) : [];
  
  const activeComplaints = (() => {
    if (activeView === 'playback') {
      const step = playbackSteps.find(s => s.id === currentPlaybackStepId);
      if (step) {
        const cutoff = new Date(step.cutoffDate).getTime();
        return baseComplaints.filter(c => new Date(c.createdAt).getTime() <= cutoff);
      }
    }
    return baseComplaints;
  })();

  // Filter roads displayed on map based on store settings
  const filteredRoads = roads.filter(road => {
    const matchesSearch = road.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          road.roadCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || road.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Mumbai coordinates (approx center of mock data)
  const defaultCenter: [number, number] = [19.0760, 72.8777];
  const defaultZoom = 11.5;

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-border/80 shadow-2xl">
      {/* Visual map status indicator */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1 text-[11px] font-medium bg-slate-950/80 backdrop-blur-md px-3 py-2.5 rounded-lg border border-border shadow-md select-none">
        <span className="text-muted-foreground uppercase tracking-wider font-semibold mb-1 text-[9px]">Road Status Keys</span>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-1.5 rounded bg-emerald-550 inline-block"></span>
          <span className="text-foreground">Good</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-1.5 rounded bg-amber-500 inline-block"></span>
          <span className="text-foreground">Fair</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-1.5 rounded bg-red-550 inline-block"></span>
          <span className="text-foreground">Poor</span>
        </div>
        {/* Utility layer legend */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.04]">
          <span className="text-muted-foreground uppercase tracking-wider font-semibold mb-0 text-[8px] shrink-0">UTILITIES</span>
          {UTILITY_LAYERS.map(u => (
            <div key={u.key} className="flex items-center gap-1">
              <span className="w-3 h-[2px] inline-block" style={{ backgroundColor: u.color }} />
              <span style={{ color: u.color }} className="text-[8px] font-semibold capitalize">{u.label.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        className="w-full h-full"
      >
        {/* Dark Styled Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="dark-map-tiles"
        />

        {/* ── Underground Utility Overlays ── */}
        {filteredRoads.map((road) => {
          const rawCoords = road.geometry.coordinates as [number, number][];
          return UTILITY_LAYERS.map(util => (
            <Polyline
              key={`util-${util.key}-${road.id}`}
              positions={getUtilityCoords(rawCoords, util.offsetLat, util.offsetLng)}
              pathOptions={{
                color: util.color,
                weight: util.weight,
                opacity: util.opacity,
                dashArray: util.dashArray,
                lineCap: 'butt',
                lineJoin: 'round',
              }}
            >
              <Popup>
                <div className="text-xs p-1 space-y-1">
                  <p className="font-semibold" style={{ color: util.color }}>{util.label}</p>
                  <p className="text-[10px] text-muted-foreground">{road.name}</p>
                  <p className="text-[9px] text-muted-foreground">Underground infrastructure layer</p>
                </div>
              </Popup>
            </Polyline>
          ));
        })}

        {/* ── Road Segment Polylines ── */}
        {filteredRoads.map((road) => {
          const isSelected = selectedRoadId === road.id;
          const coords = getLeafletCoords(road.geometry.coordinates);

          return (
            <div key={road.id}>
              {/* Outer glow halo — always present, dims when unselected */}
              <Polyline
                positions={coords}
                pathOptions={{
                  color: getStatusColor(
                    activeView === 'playback'
                      ? getHistoricalRoadState(road.id, currentPlaybackStepId).status
                      : road.status,
                    isSelected
                  ),
                  weight: isSelected ? 18 : 10,
                  opacity: isSelected ? 0.12 : 0.05,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />

              {/* Main segment polyline */}
              <Polyline
                positions={coords}
                eventHandlers={{
                  click: () => {
                    setSelectedRoadId(isSelected ? null : road.id);
                  },
                  mouseover: (e) => {
                    const layer = e.target;
                    layer.setStyle({
                      weight: isSelected ? 8 : 6,
                      opacity: 0.95
                    });
                  },
                  mouseout: (e) => {
                    const layer = e.target;
                    layer.setStyle({
                      weight: isSelected ? 6 : 4,
                      opacity: isSelected ? 1.0 : 0.8
                    });
                  }
                }}
                pathOptions={{
                  color: getStatusColor(
                    activeView === 'playback'
                      ? getHistoricalRoadState(road.id, currentPlaybackStepId).status
                      : road.status,
                    isSelected
                  ),
                  weight: isSelected ? 6 : 4,
                  opacity: isSelected ? 1.0 : 0.8,
                  lineCap: 'round',
                  lineJoin: 'round',
                  dashArray: (
                    activeView === 'playback'
                      ? getHistoricalRoadState(road.id, currentPlaybackStepId).status
                      : road.status
                  ) === 'under_construction' ? '8, 8' : undefined
                }}
              >
                <Popup>
                  <div className="text-xs p-1 space-y-1">
                    <p className="font-semibold text-slate-200">{road.name}</p>
                    <p className="text-[10px] text-muted-foreground">Code: {road.roadCode} ({road.lengthKm} km)</p>
                    <p className="text-[10px] capitalize font-medium">
                      Status: <span className={
                        (activeView === 'playback'
                          ? getHistoricalRoadState(road.id, currentPlaybackStepId).status
                          : road.status) === 'good' ? 'text-emerald-400' :
                        (activeView === 'playback'
                          ? getHistoricalRoadState(road.id, currentPlaybackStepId).status
                          : road.status) === 'fair' ? 'text-amber-400' :
                        (activeView === 'playback'
                          ? getHistoricalRoadState(road.id, currentPlaybackStepId).status
                          : road.status) === 'poor' ? 'text-red-400' : 'text-cyan-400'
                      }>
                        {(activeView === 'playback'
                          ? getHistoricalRoadState(road.id, currentPlaybackStepId).status
                          : road.status
                        ).replace('_', ' ')}
                      </span>
                    </p>
                    {activeView === 'playback' && (
                      <p className="text-[10px] font-semibold text-slate-350">
                        Health Score: {getHistoricalRoadState(road.id, currentPlaybackStepId).healthScore}%
                      </p>
                    )}
                  </div>
                </Popup>
              </Polyline>
            </div>
          );
        })}

        {/* ── SENSOR OVERLAY (only in sensor view) ── */}
        {activeView === 'sensors' && (
          <>
            {/* Stress zone circles */}
            {stressZones.map((zone) => (
              <Circle
                key={`zone-${zone.roadId}`}
                center={[zone.lat, zone.lng]}
                radius={zone.radiusMeters}
                pathOptions={{
                  color: SENSOR_LEVEL_COLORS[zone.dominantAlert],
                  fillColor: SENSOR_LEVEL_COLORS[zone.dominantAlert],
                  fillOpacity: 0.08 + zone.heatIntensity * 0.14,
                  weight: 1.5,
                  opacity: 0.5,
                  dashArray: zone.dominantAlert === 'critical' ? '4 3' : undefined
                }}
              >
                <Popup>
                  <div className="text-xs p-1 space-y-1">
                    <p className="font-bold text-slate-200">{zone.zoneLabel}</p>
                    <p className="text-[10px] text-muted-foreground">Stress Index: {zone.stressIndex}/100</p>
                    <p className={`text-[10px] font-semibold capitalize ${
                      zone.dominantAlert === 'critical' ? 'text-rose-400' :
                      zone.dominantAlert === 'elevated' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>{zone.dominantAlert} alert level</p>
                  </div>
                </Popup>
              </Circle>
            ))}

            {/* Individual sensor markers */}
            {allSensors.map((sensor) => (
              <Marker
                key={sensor.id}
                position={[sensor.lat, sensor.lng]}
                icon={createSensorIcon(sensor.level, sensor.type)}
              >
                <Popup>
                  <div className="text-xs p-1.5 space-y-1.5 max-w-[220px]">
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: SENSOR_LEVEL_COLORS[sensor.level] }} className="font-black uppercase text-[9px]">
                        {sensor.level}
                      </span>
                      <span className="text-[9px] text-muted-foreground">·</span>
                      <span className="text-[9px] text-muted-foreground">{sensor.type.replace('_', ' ')}</span>
                    </div>
                    <p className="font-bold text-slate-200 leading-tight">{sensor.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{sensor.description}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[9px] text-muted-foreground">
                      <span>{sensor.value}{sensor.unit}</span>
                      <span>{sensor.depth}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </>
        )}

        {/* Draw active complaint markers for selected road */}
        {selectedRoad && activeComplaints.map((complaint) => {
          const latLng = getLeafletPoint(complaint.geometry.coordinates);
          return (
            <Marker
              key={complaint.id}
              position={latLng}
              icon={createComplaintIcon(complaint.category)}
            >
              <Popup>
                <div className="max-w-[200px] text-xs p-1">
                  <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-red-950/80 border border-red-800/50 text-red-400 capitalize mb-1">
                    {complaint.category.replace('_', ' ')}
                  </span>
                  <h4 className="font-bold text-slate-100">{complaint.title}</h4>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{complaint.description}</p>
                  <div className="flex items-center justify-between border-t border-border/50 pt-1.5 mt-1.5 text-[9px]">
                    <span className="capitalize text-slate-300 font-medium">Status: {complaint.status}</span>
                    <span className="text-muted-foreground">{new Date(complaint.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Map state updates */}
        <MapController selectedRoad={selectedRoad} />
      </MapContainer>
    </div>
  );
}
