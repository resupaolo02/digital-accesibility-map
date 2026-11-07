"use client";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, ZoomControl, AttributionControl, useMap, useMapEvents } from "react-leaflet";
import { CATEGORY_ICON, STATUSES, type Category, type LatLng, type Loc, type Status } from "@/lib/types";

const icon = (s: Status, selected: boolean, cat: Category) => {
  const st = STATUSES[s];
  const ring = selected ? "#0f172a" : "#fff";
  const size = selected ? 46 : 38;
  const disc = size - 14;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="position:relative;width:${size}px;height:${size}px"><div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:${st.color};border:3px solid ${ring};border-radius:${st.radius};box-shadow:${selected ? "0 0 0 2px #fff," : ""}0 2px 8px #0006;transition:all .15s"><span style="width:${disc}px;height:${disc}px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#fff;font-size:${disc - 8}px;line-height:1">${CATEGORY_ICON[cat]}</span></div><span style="position:absolute;right:-6px;top:-6px;width:18px;height:18px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:${st.color};border:2px solid #fff;color:#fff;font:700 11px/1 system-ui,sans-serif">${st.glyph}</span></div>`,
  });
};

const vertex = L.divIcon({
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#fff;border:4px solid #0f172a;box-shadow:0 1px 4px #0006"></div>',
});

export type Draft = {
  category: Category; status: Status; lat: number; lng: number; path: LatLng[] | null; isLine: boolean;
};

function Clicks({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick?.(e.latlng.lat, e.latlng.lng) });
  return null;
}

// Focus the selection; `bottomPx` keeps it clear of the mobile bottom sheet.
function Focus({ loc, bottomPx, leftPx, nonce }: { loc?: Loc; bottomPx: number; leftPx: number; nonce: number }) {
  const map = useMap();
  useEffect(() => {
    if (!loc) return;
    if (loc.path && loc.path.length > 1) {
      map.fitBounds(L.latLngBounds(loc.path), { paddingBottomRight: [24, bottomPx + 24], paddingTopLeft: [leftPx + 24, 24], maxZoom: 18 });
      return;
    }
    const z = Math.max(map.getZoom(), 17);
    const c = map.project([loc.lat, loc.lng], z).add([-leftPx / 2, bottomPx / 2]);
    map.flyTo(map.unproject(c, z), z, { duration: 0.6 });
  }, [loc?.id, nonce]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function Me({ me }: { me?: LatLng }) {
  const map = useMap();
  useEffect(() => { if (me) map.flyTo(me, Math.max(map.getZoom(), 17)); }, [me, map]);
  return me ? <CircleMarker center={me} radius={9} pathOptions={{ color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }} /> : null;
}

export default function Map({ locs, selectedId, focusNonce, bottomPx, leftPx, onSelect, onPick, draft, onDrag, onDragVertex, me }: {
  locs: Loc[]; selectedId?: number; focusNonce: number; bottomPx: number; leftPx: number;
  onSelect: (id: number) => void; onPick?: (lat: number, lng: number) => void;
  draft?: Draft; onDrag?: (lat: number, lng: number) => void; onDragVertex?: (i: number, lat: number, lng: number) => void;
  me?: LatLng;
}) {
  const sel = locs.find((l) => l.id === selectedId);
  return (
    <MapContainer center={[14.1975, 121.1535]} zoom={15} zoomControl={false} attributionControl={false} className="h-full w-full" keyboard>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <AttributionControl position="bottomleft" prefix={false} />
      <ZoomControl position="bottomright" />
      <Clicks onPick={onPick} />
      <Focus loc={sel} bottomPx={bottomPx} leftPx={leftPx} nonce={focusNonce} />
      <Me me={me} />
      {locs.map((l) =>
        l.path && l.path.length > 1 ? (
          <Polyline key={l.id} positions={l.path}
            pathOptions={{ color: STATUSES[l.status].color, weight: l.id === selectedId ? 9 : 6, dashArray: STATUSES[l.status].dash, opacity: 0.9, lineCap: "round" }}
            eventHandlers={{ click: () => onSelect(l.id) }} />
        ) : (
          <Marker key={l.id} position={[l.lat, l.lng]} icon={icon(l.status, l.id === selectedId, l.category)} zIndexOffset={l.id === selectedId ? 1000 : 0}
            title={`${l.name} – ${STATUSES[l.status].label}`} eventHandlers={{ click: () => onSelect(l.id) }} />
        ))}
      {draft && !draft.isLine && (
        <Marker position={[draft.lat, draft.lng]} icon={icon(draft.status, true, draft.category)} draggable
          eventHandlers={{ dragend: (e) => { const p = (e.target as L.Marker).getLatLng(); onDrag?.(p.lat, p.lng); } }} />
      )}
      {draft?.isLine && draft.path && (
        <>
          <Polyline positions={draft.path} pathOptions={{ color: STATUSES[draft.status].color, weight: 7, dashArray: STATUSES[draft.status].dash }} />
          {draft.path.map((p, i) => (
            <Marker key={i} position={p} icon={vertex} draggable
              eventHandlers={{ dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onDragVertex?.(i, ll.lat, ll.lng); } }} />
          ))}
        </>
      )}
    </MapContainer>
  );
}
