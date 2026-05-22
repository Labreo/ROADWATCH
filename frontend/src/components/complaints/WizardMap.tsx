'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { roads } from '@/data/mockData';

interface WizardMapProps {
  center: [number, number]; // [latitude, longitude]
  onChange: (coords: [number, number]) => void;
  roadId: number | null;
}

// Swaps GeoJSON [longitude, latitude] to Leaflet [latitude, longitude]
const getLeafletCoords = (coords: [number, number][]): [number, number][] => {
  return coords.map(c => [c[1], c[0]]);
};

// Swaps GeoJSON point coordinates
const getLeafletPoint = (coords: [number, number]): [number, number] => {
  return [coords[1], coords[0]];
};

// Custom Marker styling for the user selected pin
const pinIcon = L.divIcon({
  className: 'custom-pin-wrapper',
  html: `<div class="relative flex items-center justify-center w-7 h-7">
           <div class="absolute w-7 h-7 rounded-full bg-cyan-400 opacity-40 animate-ping"></div>
           <div class="relative w-4 h-4 rounded-full bg-cyan-400 border-2 border-slate-950 shadow-lg flex items-center justify-center">
             <div class="w-1.5 h-1.5 rounded-full bg-slate-950"></div>
           </div>
         </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

// Map controller to automatically pan/zoom to selected road or pin coords
function MapController({ roadId, center }: { roadId: number | null; center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    if (roadId) {
      const road = roads.find(r => r.id === roadId);
      if (road && road.geometry.coordinates.length > 0) {
        const coords = getLeafletCoords(road.geometry.coordinates);
        const bounds = L.latLngBounds(coords);
        map.flyToBounds(bounds, {
          padding: [30, 30],
          duration: 1.2
        });
      }
    } else {
      map.panTo(center);
    }
  }, [roadId, map]);

  return null;
}

// Intercepts click events on the map to place the pin
function MapClickHandler({ onChange }: { onChange: (coords: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      onChange([e.latlng.lat, e.latlng.lng]);
    }
  });
  return null;
}

export default function WizardMap({ center, onChange, roadId }: WizardMapProps) {
  const defaultZoom = 13;

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={center}
        zoom={defaultZoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        className="w-full h-full"
      >
        {/* Dark Styled Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="dark-map-tiles"
        />

        {/* Draw Roads for context */}
        {roads.map((road) => {
          const isSelected = roadId === road.id;
          const coords = getLeafletCoords(road.geometry.coordinates);

          return (
            <div key={road.id}>
              {isSelected && (
                <Polyline
                  positions={coords}
                  pathOptions={{
                    color: '#06b6d4',
                    weight: 8,
                    opacity: 0.4,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                />
              )}
              <Polyline
                positions={coords}
                eventHandlers={{
                  click: (e) => {
                    // Let clicking a road segment also set the coordinates to the click location
                    onChange([e.latlng.lat, e.latlng.lng]);
                  }
                }}
                pathOptions={{
                  color: isSelected ? '#ffffff' : '#475569',
                  weight: isSelected ? 4 : 2,
                  opacity: isSelected ? 0.9 : 0.4,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
            </div>
          );
        })}

        {/* Pin Marker */}
        <Marker position={center} icon={pinIcon} draggable={true} eventHandlers={{
          dragend: (e) => {
            const marker = e.target;
            const position = marker.getLatLng();
            onChange([position.lat, position.lng]);
          }
        }} />

        {/* Map state updates */}
        <MapController roadId={roadId} center={center} />
        <MapClickHandler onChange={onChange} />
      </MapContainer>
    </div>
  );
}
