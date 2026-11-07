"use client";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import { STATUSES, type Loc } from "@/lib/types";

const icon = (s: keyof typeof STATUSES, selected: boolean) => {
  const st = STATUSES[s];
  return L.divIcon({
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: `<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:${st.color};color:#fff;font:700 18px/1 sans-serif;border:${selected ? "4px solid #facc15" : "2px solid #fff"};border-radius:${st.radius};box-shadow:0 1px 4px #0008">${st.glyph}</div>`,
  });
};

function Clicks({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick?.(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Fly({ to }: { to?: [number, number] }) {
  const map = useMap();
  useEffect(() => { if (to) map.flyTo(to, Math.max(map.getZoom(), 17)); }, [to, map]);
  return null;
}

export default function Map({ locs, selectedId, onSelect, onPick, draft, onDrag }: {
  locs: Loc[]; selectedId?: number; onSelect: (id: number) => void;
  onPick?: (lat: number, lng: number) => void;
  draft?: { lat: number; lng: number; status: keyof typeof STATUSES };
  onDrag?: (lat: number, lng: number) => void;
}) {
  const sel = locs.find((l) => l.id === selectedId);
  return (
    <MapContainer center={[14.1975, 121.1535]} zoom={15} className="h-full w-full" keyboard>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Clicks onPick={onPick} />
      <Fly to={sel ? [sel.lat, sel.lng] : undefined} />
      {locs.map((l) => (
        <Marker key={l.id} position={[l.lat, l.lng]} icon={icon(l.status, l.id === selectedId)}
          title={`${l.name} – ${STATUSES[l.status].label}`} eventHandlers={{ click: () => onSelect(l.id) }} />
      ))}
      {draft && (
        <Marker position={[draft.lat, draft.lng]} icon={icon(draft.status, true)} draggable
          eventHandlers={{ dragend: (e) => { const p = (e.target as L.Marker).getLatLng(); onDrag?.(p.lat, p.lng); } }} />
      )}
    </MapContainer>
  );
}
