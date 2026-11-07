import { sql } from "@/lib/db";
import type { Feature, LatLng, Photo } from "@/lib/types";

type Row = {
  id: number; name: string; category: string; status: string; lat: number; lng: number;
  path: LatLng[] | null; features: Feature[]; existing: string; barriers: string;
  recommendations: string; source: string; photos: Photo[]; updated_by: string | null; updated_at: string;
};

// Prefix formula-looking cells so Excel/Sheets don't execute editor-typed text.
const q = (v: unknown) => {
  const s = v instanceof Date ? v.toISOString() : String(v ?? "");
  return `"${(/^[=+\-@\t\r]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`;
};

// ?format=geojson for GIS tools (QGIS, Google My Maps); default CSV opens in Excel / Google Sheets.
export async function GET(req: Request) {
  const rows = (await sql`SELECT * FROM locations ORDER BY id`) as Row[];
  if (new URL(req.url).searchParams.get("format") === "geojson") {
    const body = {
      type: "FeatureCollection",
      features: rows.map((r) => ({
        type: "Feature",
        geometry: r.path
          ? { type: "LineString", coordinates: r.path.map(([la, lo]) => [lo, la]) }
          : { type: "Point", coordinates: [r.lng, r.lat] },
        properties: { id: r.id, name: r.name, category: r.category, status: r.status, features: r.features,
          existing: r.existing, barriers: r.barriers, recommendations: r.recommendations, source: r.source,
          photos: r.photos.map((p) => p.url), updated_by: r.updated_by, updated_at: r.updated_at },
      })),
    };
    return new Response(JSON.stringify(body), {
      headers: { "content-type": "application/geo+json", "content-disposition": 'attachment; filename="barangay-real-access.geojson"' },
    });
  }
  const head = ["id", "name", "category", "status", "lat", "lng", "features", "existing", "barriers", "recommendations", "source", "photos", "updated_by", "updated_at"];
  const lines = rows.map((r) => [
    r.id, r.name, r.category, r.status, r.lat, r.lng,
    r.features.map((f) => `${f.type}:${f.status}${f.note ? ` (${f.note})` : ""}`).join("; "),
    r.existing, r.barriers, r.recommendations, r.source, r.photos.map((p) => p.url).join(" "), r.updated_by, r.updated_at,
  ].map(q).join(","));
  return new Response("﻿" + [head.join(","), ...lines].join("\r\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="barangay-real-access.csv"' },
  });
}
