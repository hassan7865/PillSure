"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Default view: Karachi — used until coordinates are set or parsed. */
export const DEFAULT_MAP_CENTER: [number, number] = [24.8607, 67.0011];

const markerIcon = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function parseLatLng(latitude: string, longitude: string): [number, number] {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return [lat, lng];
  }
  return DEFAULT_MAP_CENTER;
}

function hasValidPosition(latitude: string, longitude: string): boolean {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function MapViewSync({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([lat, lng], { animate: true });
  }, [lat, lng, map]);
  return null;
}

function MapClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function MedicalStoreMapPickerInner({
  latitude,
  longitude,
  onPositionChange,
  className,
}: {
  latitude: string;
  longitude: string;
  onPositionChange: (lat: number, lng: number) => void;
  className?: string;
}) {
  const placed = useMemo(() => hasValidPosition(latitude, longitude), [latitude, longitude]);
  const [lat, lng] = useMemo(() => parseLatLng(latitude, longitude), [latitude, longitude]);

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={14}
      className={cn("z-0 h-[min(360px,55vh)] w-full rounded-md border bg-muted/20", className)}
      scrollWheelZoom
    >
      <TileLayer attribution={OSM_ATTRIBUTION} url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {placed && <MapViewSync lat={lat} lng={lng} />}
      <MapClickHandler onSelect={onPositionChange} />
      {placed && (
        <Marker
          position={[lat, lng]}
          icon={markerIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const p = e.target.getLatLng();
              onPositionChange(p.lat, p.lng);
            },
          }}
        />
      )}
    </MapContainer>
  );
}

export function MedicalStoreMapDisplayInner({
  latitude,
  longitude,
  className,
}: {
  latitude: number;
  longitude: number;
  className?: string;
}) {
  const lat = Number.isFinite(latitude) ? latitude : DEFAULT_MAP_CENTER[0];
  const lng = Number.isFinite(longitude) ? longitude : DEFAULT_MAP_CENTER[1];

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      className={cn("z-0 h-[min(360px,55vh)] w-full rounded-md border bg-muted/20", className)}
      scrollWheelZoom
    >
      <TileLayer attribution={OSM_ATTRIBUTION} url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapViewSync lat={lat} lng={lng} />
      <Marker position={[lat, lng]} icon={markerIcon} />
    </MapContainer>
  );
}
