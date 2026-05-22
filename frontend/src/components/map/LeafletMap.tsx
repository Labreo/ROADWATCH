'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '@/store/useStore';
import { roads, getComplaintsForRoad } from '@/data/mockData';
import { Road } from '@/types';

// Swaps GeoJSON [longitude, latitude] to Leaflet [latitude, longitude]
const getLeafletCoords = (coords: [number, number][]): [number, number][] => {
  return coords.map(c => [c[1], c[0]]);
};

// Swaps GeoJSON point coordinates
const getLeafletPoint = (coords: [number, number]): [number, number] => {
  return [coords[1], coords[0]];
};

// Color codes based on road status
const getStatusColor = (status: string, isSelected: boolean) => {
  if (isSelected) return '#ffffff'; // White highlight for selected segment
  switch (status) {
    case 'good': return '#10b981'; // Emerald Green
    case 'fair': return '#f59e0b'; // Amber
    case 'poor': return '#ef4444'; // Red
    case 'under_construction': return '#06b6d4'; // Cyan
    default: return '#94a3b8';
  }
};

// Helper component to center and animate map viewpoint changes
function MapController({ selectedRoad }: { selectedRoad: Road | null }) {
  const map = useMap();

  useEffect(() => {
    if (selectedRoad && selectedRoad.geometry.coordinates.length > 0) {
      // Find midpoint or bound fit
      const leafletCoords = getLeafletCoords(selectedRoad.geometry.coordinates);
      const bounds = L.latLngBounds(leafletCoords);
      map.flyToBounds(bounds, {
        padding: [50, 50],
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [selectedRoad, map]);

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

export default function LeafletMap() {
  const { 
    selectedRoadId, 
    setSelectedRoadId, 
    searchQuery, 
    statusFilter 
  } = useStore();

  // Find active road object
  const selectedRoad = roads.find(r => r.id === selectedRoadId) || null;

  // Active complaints for selected road
  const activeComplaints = selectedRoad ? getComplaintsForRoad(selectedRoad.id) : [];

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
          <span className="w-2.5 h-1.5 rounded bg-emerald-500 inline-block"></span>
          <span className="text-foreground">Good</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-1.5 rounded bg-amber-500 inline-block"></span>
          <span className="text-foreground">Fair</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-1.5 rounded bg-red-500 inline-block"></span>
          <span className="text-foreground">Poor</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-1.5 rounded bg-cyan-500 inline-block"></span>
          <span className="text-foreground">Work Underway</span>
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

        {/* Draw Roads Polylines */}
        {filteredRoads.map((road) => {
          const isSelected = selectedRoadId === road.id;
          const coords = getLeafletCoords(road.geometry.coordinates);

          return (
            <div key={road.id}>
              {/* Outer shadow polyline for selected glowing effect */}
              {isSelected && (
                <Polyline
                  positions={coords}
                  pathOptions={{
                    color: '#06b6d4',
                    weight: 12,
                    opacity: 0.35,
                    lineCap: 'round',
                    lineJoin: 'round'
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
                  color: getStatusColor(road.status, isSelected),
                  weight: isSelected ? 6 : 4,
                  opacity: isSelected ? 1.0 : 0.8,
                  lineCap: 'round',
                  lineJoin: 'round',
                  dashArray: road.status === 'under_construction' ? '8, 8' : undefined
                }}
              >
                <Popup>
                  <div className="text-xs p-1">
                    <p className="font-semibold text-slate-200">{road.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Code: {road.roadCode} ({road.lengthKm} km)</p>
                    <p className="text-[10px] capitalize font-medium mt-1">
                      Status: <span className={
                        road.status === 'good' ? 'text-emerald-400' :
                        road.status === 'fair' ? 'text-amber-400' :
                        road.status === 'poor' ? 'text-red-400' : 'text-cyan-400'
                      }>{road.status.replace('_', ' ')}</span>
                    </p>
                  </div>
                </Popup>
              </Polyline>
            </div>
          );
        })}

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
