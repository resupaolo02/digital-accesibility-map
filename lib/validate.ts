import { CATEGORIES, STATUSES } from "./types";

export function validate(b: Record<string, unknown>) {
  const lat = Number(b.lat), lng = Number(b.lng);
  if (!String(b.name ?? "").trim() || !(b.category as string in CATEGORIES) || !(b.status as string in STATUSES)
    || !isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const s = (k: string) => String(b[k] ?? "").slice(0, 4000);
  return {
    name: s("name").trim(), category: String(b.category), status: String(b.status), lat, lng,
    existing: s("existing"), barriers: s("barriers"), recommendations: s("recommendations"), source: s("source"),
    photos: JSON.stringify(Array.isArray(b.photos) ? b.photos.slice(0, 20) : []),
  };
}
