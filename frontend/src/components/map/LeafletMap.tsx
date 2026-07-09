'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '@/store/useStore';
import { roads, projects, getComplaintsForRoad } from '@/data/mockData';
import { Road } from '@/types';
import { getHistoricalRoadState, playbackSteps } from '@/data/historicalData';
import { generateSensorsForRoads, generateStressZones, SENSOR_LEVEL_COLORS, SENSOR_COLORS, type SensorReading } from '@/data/sensorData';
import { useGeolocation } from '@/hooks/useGeolocation';
import RoadClassificationLegend from './RoadClassificationLegend';

// Swaps GeoJSON [longitude, latitude] to Leaflet [latitude, longitude]
const getLeafletCoords = (coords: [number, number][]): [number, number][] => {
  return coords.map(c => [c[1], c[0]]);
};

// Swaps GeoJSON point coordinates
const getLeafletPoint = (coords: [number, number]): [number, number] => {
  return [coords[1], coords[0]];
};

// Color codes based on road status — cinematic intelligence palette
const getStatusColor = (status: string, isSelected: boolean, isLightMode: boolean) => {
  if (isSelected) return isLightMode ? '#0891b2' : '#22d3ee';
  switch (status) {
    case 'good':              return '#10b981'; // Signal emerald
    case 'fair':              return '#f59e0b'; // Signal amber
    case 'poor':              return '#f43f5e'; // Signal rose
    case 'under_construction':return isLightMode ? '#94a3b8' : '#71717a'; // Muted zinc
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

// Custom HTML/Tailwind styling for markers with multi-layered glowing concentric ripples
const createComplaintIcon = (category: string) => {
  let color = '#ef4444';
  if (category === 'waterlogging') color = '#3b82f6';
  if (category === 'paving_defect') color = '#f59e0b';
  if (category === 'debris') color = '#ea580c';
  if (category === 'missing_signage') color = '#d946ef';

  return L.divIcon({
    className: 'custom-marker-wrapper',
    html: `<div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;color:${color}">
             <div class="marker-ripple"></div>
             <div class="marker-ripple marker-ripple-2"></div>
             <div style="width:10px;height:10px;border-radius:50%;background:${color};border:1.5px solid #09090b;box-shadow:0 0 10px ${color};z-index:2"></div>
           </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

const createSensorIcon = (level: SensorReading['level'], type: SensorReading['type']) => {
  const colors: Record<SensorReading['level'], string> = {
    nominal:  '#10b981',
    elevated: '#f59e0b',
    critical: '#f43f5e'
  };
  const color = colors[level];
  return L.divIcon({
    className: 'sensor-marker-wrapper',
    html: `<div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;color:${color}">
             <div class="marker-ripple"></div>
             <div class="marker-ripple marker-ripple-2"></div>
             <div style="width:10px;height:10px;border-radius:50%;background:${color};border:1.5px solid #09090b;box-shadow:0 0 10px ${color};z-index:2"></div>
           </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

const createMaintenanceIcon = () => {
  return L.divIcon({
    className: 'maintenance-marker-wrapper',
    html: `<div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;color:#f59e0b">
             <div class="marker-ripple"></div>
             <div class="marker-ripple marker-ripple-2"></div>
             <div style="width:18px;height:18px;border-radius:50%;background:#f59e0b;border:2px solid #09090b;box-shadow:0 0 10px rgba(245,158,11,0.55);display:flex;align-items:center;justify-content:center;font-size:9px;z-index:2">🚧</div>
           </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const createBudgetIcon = () => {
  return L.divIcon({
    className: 'budget-marker-wrapper',
    html: `<div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;color:#10b981">
             <div class="marker-ripple"></div>
             <div class="marker-ripple marker-ripple-2"></div>
             <div style="width:18px;height:18px;border-radius:50%;background:#10b981;border:2px solid #09090b;box-shadow:0 0 10px rgba(16,185,129,0.55);display:flex;align-items:center;justify-content:center;font-size:9px;color:#09090b;font-weight:bold;z-index:2">₹</div>
           </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const getRoadMidpoint = (coordinates: [number, number][]): [number, number] => {
  if (coordinates.length === 0) return [19.0760, 72.8777];
  const midIndex = Math.floor(coordinates.length / 2);
  const midPoint = coordinates[midIndex];
  return [midPoint[1], midPoint[0]]; // [lat, lng]
};

export default function LeafletMap() {
  const {
    selectedRoadId,
    setSelectedRoadId,
    searchQuery,
    statusFilter,
    activeView,
    currentPlaybackStepId,
    complaintsList,
    isOnline
  } = useStore();

  const geo = useGeolocation();
  const [showManualLocation, setShowManualLocation] = useState(false);

  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsLightMode(document.documentElement.classList.contains('light'));
    
    const observer = new MutationObserver(() => {
      setIsLightMode(document.documentElement.classList.contains('light'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const tileUrl = isLightMode 
    ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

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
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-border/80 shadow-2xl"
      role="application"
      aria-label={isOnline ? 'Interactive road map' : 'Map data limited — offline mode'}
    >
      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="map-status-announcements" />

      {/* Geolocation error toast */}
      {geo.error && (
        <div role="alert" className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[1006] glass-depth-2 border border-amber-500/30 rounded-2xl p-4 shadow-2xl animate-toast-in">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-amber-300">
                Can't find your location — tap to set manually
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={geo.retry}
                  className="text-[9px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 transition-all"
                  aria-label="Retry geolocation"
                >
                  Retry
                </button>
                <button
                  onClick={() => setShowManualLocation(!showManualLocation)}
                  className="text-[9px] font-bold px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all"
                  aria-label="Set location manually"
                >
                  Set location manually
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visual map status indicator */}
      <div className="absolute top-3 right-3 z-[1005] flex flex-col gap-1.5 text-[10px] font-bold glass-panel px-4 py-3 rounded-xl border border-border/80 shadow-2xl select-none min-w-[125px] border-l-2 border-l-cyan-400/80 transition-all duration-300"
        role="region"
        aria-label="Map legend">
        <span className="text-muted-foreground uppercase tracking-widest font-black mb-1.5 text-[8px] opacity-75">Status Matrix</span>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-1.5 rounded-sm bg-[#34d399] inline-block shadow-sm"></span>
          <span className="text-slate-200 text-[10px] font-semibold tracking-wide">Good</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-1.5 rounded-sm bg-[#f59e0b] inline-block shadow-sm"></span>
          <span className="text-slate-200 text-[10px] font-semibold tracking-wide">Fair</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-1.5 rounded-sm bg-[#f43f5e] inline-block shadow-sm"></span>
          <span className="text-slate-200 text-[10px] font-semibold tracking-wide">Poor</span>
        </div>
        {/* Utility layer legend */}
        <div className="flex flex-wrap items-center gap-2 mt-2 pt-2.5 border-t border-white/[0.04]">
          <span className="text-muted-foreground uppercase tracking-widest font-black text-[8px] shrink-0 opacity-75 mr-1">Utilities</span>
          {UTILITY_LAYERS.map(u => (
            <div key={u.key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-[2px] inline-block" style={{ backgroundColor: u.color }} />
              <span style={{ color: u.color }} className="text-[8px] font-bold uppercase tracking-wider">{u.label.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Road classification legend */}
      <RoadClassificationLegend />

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        className="w-full h-full"
      >
        {/* Sleek Cinematic CartoDB Dynamic Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={tileUrl}
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
          const roadStatus = activeView === 'playback'
            ? getHistoricalRoadState(road.id, currentPlaybackStepId).status
            : road.status;
          
          const color = getStatusColor(roadStatus, isSelected, isLightMode);

          return (
            <div key={road.id}>
              {/* Outer glow halo — always present, dims when unselected */}
              <Polyline
                positions={coords}
                pathOptions={{
                  color: color,
                  weight: isSelected ? 24 : 12,
                  opacity: isSelected ? 0.18 : 0.06,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />

              {/* Selected Middle Glow — only when selected, adds neon light intensity */}
              {isSelected && (
                <Polyline
                  positions={coords}
                  pathOptions={{
                    color: color,
                    weight: 12,
                    opacity: 0.45,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              )}

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
                      weight: isSelected ? 7 : 5,
                      opacity: 0.95
                    });
                  },
                  mouseout: (e) => {
                    const layer = e.target;
                    layer.setStyle({
                      weight: isSelected ? 4.5 : 3.5,
                      opacity: isSelected ? 1.0 : 0.85
                    });
                  }
                }}
                pathOptions={{
                  color: color,
                  weight: isSelected ? 4.5 : 3.5,
                  opacity: isSelected ? 1.0 : 0.85,
                  lineCap: 'round',
                  lineJoin: 'round',
                  dashArray: roadStatus === 'under_construction' ? '8, 8' : undefined
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

        {/* ── HEATMAP LAYER (only in roads registry explorer mode) ── */}
        {activeView === 'roads' && complaintsList.map((complaint) => {
          const latLng = getLeafletPoint(complaint.geometry.coordinates);
          return (
            <Circle
              key={`heatmap-${complaint.id}`}
              center={latLng}
              radius={180}
              pathOptions={{
                color: '#f43f5e',
                fillColor: '#f43f5e',
                fillOpacity: 0.12,
                weight: 0,
              }}
            />
          );
        })}

        {/* ── CITIZEN COMPLAINT INDICATORS (visible in roads view) ── */}
        {activeView === 'roads' && complaintsList.map((complaint) => {
          const latLng = getLeafletPoint(complaint.geometry.coordinates);
          return (
            <Marker
              key={`complaint-marker-${complaint.id}`}
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
                    <span className="capitalize text-slate-350 font-semibold">{complaint.status}</span>
                    <span className="text-muted-foreground">{new Date(complaint.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* ── MAINTENANCE MARKERS (hardhat zones in roads mode) ── */}
        {activeView === 'roads' && filteredRoads.filter(r => r.status === 'under_construction').map((road) => {
          const midpoint = getRoadMidpoint(road.geometry.coordinates);
          return (
            <Marker
              key={`maintenance-${road.id}`}
              position={midpoint}
              icon={createMaintenanceIcon()}
            >
              <Popup>
                <div className="text-xs p-1.5 space-y-1">
                  <p className="font-extrabold text-amber-400 text-[10px] tracking-wide">🚧 ACTIVE WORK ZONE</p>
                  <p className="font-bold text-slate-200">{road.name}</p>
                  <p className="text-[10px] text-muted-foreground">Diversions active. Paving in progress.</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* ── BUDGET TRANSPARENCY MARKERS (rupee alerts in roads mode) ── */}
        {activeView === 'roads' && filteredRoads.map((road) => {
          const project = projects.find(p => p.roadId === road.id && p.budgetAllocated >= 50000000);
          if (!project) return null;
          const midpoint = getRoadMidpoint(road.geometry.coordinates);
          return (
            <Marker
              key={`budget-marker-${road.id}`}
              position={midpoint}
              icon={createBudgetIcon()}
            >
              <Popup>
                <div className="text-xs p-1.5 space-y-1.5 max-w-[200px]">
                  <span className="inline-block text-[8.5px] px-1.5 py-0.5 rounded bg-emerald-955 border border-emerald-800 text-emerald-400 font-extrabold uppercase">
                    ₹ AUDIT LEDGER
                  </span>
                  <h4 className="font-bold text-slate-100">{road.name}</h4>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{project.title}</p>
                  <div className="flex justify-between border-t border-border/40 pt-1 text-[9px] font-bold text-slate-350">
                    <span>Allocated: ₹{(project.budgetAllocated / 10000000).toFixed(1)}Cr</span>
                    <span className="text-emerald-400">Spent: {Math.round((project.budgetSpent / project.budgetAllocated) * 100)}%</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Draw active complaint markers for selected road in other views */}
        {activeView !== 'roads' && selectedRoad && activeComplaints.map((complaint) => {
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
