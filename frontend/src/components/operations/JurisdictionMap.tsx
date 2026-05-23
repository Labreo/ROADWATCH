import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '@/store/useStore';
import { authorities, roads } from '@/data/mockData';
import { Complaint } from '@/types';

// Convert GeoJSON Polygon coordinates [lon, lat][][] to Leaflet [lat, lon][][]
const getLeafletPolygonCoords = (coords: [number, number][][]): [number, number][][] => {
  return coords.map(ring => ring.map(c => [c[1], c[0]]));
};

// Convert GeoJSON Point coordinates [lon, lat] to Leaflet [lat, lon]
const getLeafletPoint = (coords: [number, number]): [number, number] => {
  return [coords[1], coords[0]];
};

interface JurisdictionMapProps {
  selectedComplaintId: number | null;
  onSelectComplaint: (id: number | null) => void;
}

// Controller component to center and fly to selected complaint
function MapController({ selectedComplaint }: { selectedComplaint: Complaint | null }) {
  const map = useMap();

  useEffect(() => {
    if (selectedComplaint && selectedComplaint.geometry.coordinates) {
      const latLng = getLeafletPoint(selectedComplaint.geometry.coordinates);
      map.flyTo(latLng, 14, {
        duration: 1.2,
        easeLinearity: 0.25
      });
    }
  }, [selectedComplaint, map]);

  return null;
}

// Custom icons based on status
const createStatusMarkerIcon = (status: string, isSelected: boolean) => {
  let color = 'bg-amber-500 border-amber-300';
  if (status === 'resolved') color = 'bg-emerald-500 border-emerald-300';
  if (status === 'in_progress') color = 'bg-cyan-500 border-cyan-300';
  if (status === 'routed') color = 'bg-indigo-500 border-indigo-300';
  if (status === 'rejected') color = 'bg-slate-500 border-slate-350';

  const selectPulse = isSelected ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-slate-950' : '';

  return L.divIcon({
    className: 'custom-status-marker',
    html: `<div class="relative flex items-center justify-center w-6 h-6 transition-all duration-300 ${selectPulse}">
             <div class="absolute w-5 h-5 rounded-full ${color.split(' ')[0]} opacity-30 animate-ping"></div>
             <div class="relative w-3.5 h-3.5 rounded-full ${color} border-2 shadow-md"></div>
           </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

export default function JurisdictionMap({
  selectedComplaintId,
  onSelectComplaint
}: JurisdictionMapProps) {
  const { complaintsList } = useStore();

  const selectedComplaint = complaintsList.find(c => c.id === selectedComplaintId) || null;

  // Mumbai Center coordinates
  const center: [number, number] = [19.0760, 72.8777];
  const zoom = 11.5;

  // Style colors for ward polygons
  const wardStyles = [
    { fill: '#3b82f6', border: '#2563eb' }, // Blue MCGM-KW
    { fill: '#a855f7', border: '#9333ea' }, // Purple MCGM-FN
    { fill: '#06b6d4', border: '#0891b2' }  // Cyan MCGM-HE
  ];

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-border/80 shadow-2xl bg-slate-950">
      
      {/* Legend overlays */}
      <div className="absolute bottom-3 left-3 z-[1000] flex flex-col gap-1 text-[9px] font-bold bg-slate-950/85 backdrop-blur-md px-3 py-2 rounded-lg border border-border/60 text-slate-300 pointer-events-none select-none">
        <span className="text-[7.5px] uppercase tracking-wider text-muted-foreground block mb-0.5">Legend Keys</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-300 inline-block" />
          <span>Pending / Unassigned</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 border border-indigo-300 inline-block" />
          <span>Routed to Agency</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 border border-cyan-300 inline-block" />
          <span>In Progress (Dispatched)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-300 inline-block" />
          <span>Resolved</span>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="dark-map-tiles"
        />

        {/* Draw Local MCGM Ward Polygons (Agencies 1, 2, 3) */}
        {authorities.slice(0, 3).map((auth, idx) => {
          const style = wardStyles[idx % wardStyles.length];
          const coords = getLeafletPolygonCoords(auth.boundaryGeoJSON.coordinates as [number, number][][]);
          return (
            <Polygon
              key={auth.id}
              positions={coords}
              pathOptions={{
                color: style.border,
                fillColor: style.fill,
                fillOpacity: 0.08,
                weight: 1.5,
                dashArray: '3, 5'
              }}
            >
              <Popup>
                <div className="text-[10px] p-0.5">
                  <h4 className="font-extrabold text-slate-100">{auth.name}</h4>
                  <p className="text-muted-foreground mt-0.5 font-bold uppercase tracking-wider text-[8px]">
                    Jurisdiction Bounds Code: {auth.departmentCode}
                  </p>
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* Draw all complaint markers */}
        {complaintsList.map((complaint) => {
          const latLng = getLeafletPoint(complaint.geometry.coordinates);
          const isSelected = selectedComplaintId === complaint.id;
          const road = complaint.roadId ? roads.find(r => r.id === complaint.roadId) : null;
          
          return (
            <Marker
              key={complaint.id}
              position={latLng}
              icon={createStatusMarkerIcon(complaint.status, isSelected)}
              eventHandlers={{
                click: () => onSelectComplaint(isSelected ? null : complaint.id || null)
              }}
            >
              <Popup>
                <div className="max-w-[200px] text-xs p-1 space-y-1.5">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-border text-slate-400">
                      ID: #{complaint.id}
                    </span>
                    <span className={`text-[8.5px] font-black uppercase capitalize text-slate-350`}>
                      {complaint.status}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-100 leading-snug">{complaint.title}</h4>
                  <p className="text-[10px] text-slate-400 font-medium line-clamp-2">{complaint.description}</p>
                  <p className="text-[9px] text-muted-foreground font-semibold border-t border-border/20 pt-1.5 mt-1.5 flex items-center gap-0.5">
                    Segment: {road ? road.name : 'Unknown Segment'}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Dynamic Map panning controller */}
        <MapController selectedComplaint={selectedComplaint} />
      </MapContainer>
    </div>
  );
}
