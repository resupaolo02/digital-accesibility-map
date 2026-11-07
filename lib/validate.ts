import { CATEGORIES, FEATURES, STATUSES } from "./types";

const num = (v: unknown) => Number(v);

export function validate(b: Record<string, unknown>) {
  const lat = num(b.lat), lng = num(b.lng);
  if (!String(b.name ?? "").trim() || !(String(b.category) in CATEGORIES) || !(String(b.status) in STATUSES)
    || !isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const s = (k: string) => String(b[k] ?? "").slice(0, 4000);
  const path = Array.isArray(b.path)
    ? b.path.slice(0, 500).map((p) => [num(p?.[0]), num(p?.[1])]).filter(([a, o]) => isFinite(a) && isFinite(o))
    : [];
  const features = (Array.isArray(b.features) ? b.features : []).slice(0, 30)
    .filter((f: { type?: string; status?: string }) => String(f?.type) in FEATURES && String(f?.status) in STATUSES)
    .map((f: { type: string; status: string; note?: string }) => ({ type: f.type, status: f.status, note: String(f.note ?? "").slice(0, 1000) }));
  const photos = (Array.isArray(b.photos) ? b.photos : []).slice(0, 40)
    .filter((p: { url?: unknown }) => /^https:\/\//.test(String(p?.url)))
    .map((p: { url: string; caption?: string; feature?: string }) => ({
      url: String(p.url), caption: String(p.caption ?? "").slice(0, 200),
      ...(p.feature && p.feature in FEATURES ? { feature: p.feature } : {}),
    }));
  return {
    name: s("name").trim(), category: String(b.category), status: String(b.status), lat, lng,
    path: path.length >= 2 ? JSON.stringify(path) : null,
    features: JSON.stringify(features),
    existing: s("existing"), barriers: s("barriers"), recommendations: s("recommendations"), source: s("source"),
    photos: JSON.stringify(photos),
  };
}
