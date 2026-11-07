"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, STATUSES, type Category, type Loc, type Photo, type Status } from "@/lib/types";

const Map = dynamic(() => import("./Map"), { ssr: false, loading: () => <p className="p-4">Loading map…</p> });

type Draft = Omit<Loc, "id" | "updated_by" | "updated_at"> & { id?: number };
const blank = (lat: number, lng: number): Draft => ({
  name: "", category: "other", status: "needs_assessment", lat, lng,
  existing: "", barriers: "", recommendations: "", source: "", photos: [],
});

export default function App() {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [user, setUser] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [stat, setStat] = useState("");
  const [selId, setSelId] = useState<number>();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [msg, setMsg] = useState("");

  const load = () => fetch("/api/locations").then((r) => r.json()).then(setLocs).catch(() => setMsg("Could not load locations."));
  useEffect(() => {
    load();
    fetch("/api/me").then((r) => r.json()).then((d) => setUser(d.user));
  }, []);

  const shown = useMemo(() => locs.filter((l) =>
    (!cat || l.category === cat) && (!stat || l.status === stat) &&
    (!q || `${l.name} ${l.existing} ${l.barriers}`.toLowerCase().includes(q.toLowerCase()))), [locs, q, cat, stat]);
  const sel = locs.find((l) => l.id === selId);

  async function save() {
    if (!draft) return;
    const r = await fetch(draft.id ? `/api/locations/${draft.id}` : "/api/locations", {
      method: draft.id ? "PUT" : "POST", body: JSON.stringify(draft),
    });
    if (!r.ok) return setMsg(`Save failed: ${await r.text()}`);
    const row: Loc = await r.json();
    setDraft(null); setMsg("Saved."); await load(); setSelId(row.id);
  }
  async function remove(l: Loc) {
    if (!confirm(`Delete "${l.name}"? This cannot be undone.`)) return;
    const r = await fetch(`/api/locations/${l.id}`, { method: "DELETE" });
    if (r.ok) { setSelId(undefined); load(); } else setMsg("Delete failed.");
  }
  async function upload(files: FileList | null) {
    if (!files || !draft) return;
    const added: Photo[] = [];
    for (const f of Array.from(files)) {
      const body = new FormData(); body.append("file", f);
      const r = await fetch("/api/upload", { method: "POST", body });
      if (r.ok) added.push({ url: (await r.json()).url }); else setMsg(`Upload failed: ${await r.text()}`);
    }
    setDraft((d) => d && { ...d, photos: [...d.photos, ...added] });
  }
  async function logout() { await fetch("/api/logout", { method: "POST" }); setUser(null); setDraft(null); }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => d && { ...d, [k]: v });
  const field = "mt-1 w-full rounded border p-2";

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <section className="h-[45dvh] shrink-0 md:order-2 md:h-full md:flex-1" aria-label="Map">
        <Map locs={shown} selectedId={selId}
          onSelect={(id) => { setSelId(id); setDraft(null); }}
          onPick={draft ? (lat, lng) => setDraft((d) => d && { ...d, lat, lng }) : undefined}
          draft={draft ?? undefined}
          onDrag={(lat, lng) => setDraft((d) => d && { ...d, lat, lng })} />
      </section>

      <aside className="flex min-h-0 flex-1 flex-col overflow-y-auto border-t bg-white p-4 text-gray-900 md:w-[26rem] md:flex-none md:border-r md:border-t-0">
        <header className="mb-3 flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold leading-tight">Barangay Real Access<span className="block text-sm font-normal text-gray-600">Accessibility map · Real, Calamba, Laguna</span></h1>
          {user ? <button onClick={logout} className="rounded border px-2 py-1 text-sm">Log out ({user})</button>
            : <Link href="/login" className="rounded border px-2 py-1 text-sm">Editor login</Link>}
        </header>
        {msg && <p role="status" className="mb-2 rounded bg-yellow-100 p-2 text-sm">{msg}</p>}

        {draft ? (
          <form onSubmit={(e) => { e.preventDefault(); save(); }} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{draft.id ? "Edit location" : "New location"}</h2>
            <p className="text-sm text-gray-600">Click the map or drag the pin to set the position.</p>
            <label>Name<input required value={draft.name} onChange={(e) => set("name", e.target.value)} className={field} /></label>
            <label>Category<select value={draft.category} onChange={(e) => set("category", e.target.value as Category)} className={field}>
              {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label>Status<select value={draft.status} onChange={(e) => set("status", e.target.value as Status)} className={field}>
              {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
            <div className="flex gap-2">
              <label className="flex-1">Latitude<input type="number" step="any" required value={draft.lat} onChange={(e) => set("lat", Number(e.target.value))} className={field} /></label>
              <label className="flex-1">Longitude<input type="number" step="any" required value={draft.lng} onChange={(e) => set("lng", Number(e.target.value))} className={field} /></label>
            </div>
            <label>Existing accessibility features<textarea rows={3} value={draft.existing} onChange={(e) => set("existing", e.target.value)} className={field} /></label>
            <label>Barriers / missing facilities<textarea rows={3} value={draft.barriers} onChange={(e) => set("barriers", e.target.value)} className={field} /></label>
            <label>Recommended improvements<textarea rows={3} value={draft.recommendations} onChange={(e) => set("recommendations", e.target.value)} className={field} /></label>
            <label>Source / fieldwork notes<textarea rows={2} value={draft.source} onChange={(e) => set("source", e.target.value)} className={field} /></label>
            <label>Photos<input type="file" accept="image/*" multiple onChange={(e) => upload(e.target.files)} className={field} /></label>
            <ul className="flex flex-wrap gap-2">
              {draft.photos.map((p, i) => (
                <li key={p.url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="h-20 w-20 rounded object-cover" />
                  <button type="button" aria-label="Remove photo" onClick={() => set("photos", draft.photos.filter((_, j) => j !== i))}
                    className="absolute -right-1 -top-1 rounded-full bg-red-700 px-1.5 text-white">×</button>
                </li>))}
            </ul>
            <div className="flex gap-2">
              <button className="flex-1 rounded bg-blue-700 p-2 font-semibold text-white">Save</button>
              <button type="button" onClick={() => setDraft(null)} className="flex-1 rounded border p-2">Cancel</button>
            </div>
          </form>
        ) : sel ? (
          <article>
            <button onClick={() => setSelId(undefined)} className="mb-2 text-blue-700 underline">← All locations</button>
            <h2 className="text-lg font-semibold">{sel.name}</h2>
            <p className="mb-2 text-sm text-gray-600">{CATEGORIES[sel.category]}</p>
            <p className="mb-3 inline-block rounded px-2 py-1 text-sm font-semibold text-white" style={{ background: STATUSES[sel.status].color }}>
              {STATUSES[sel.status].glyph} {STATUSES[sel.status].label}</p>
            {([["Existing accessibility features", sel.existing], ["Barriers / missing facilities", sel.barriers],
              ["Recommended improvements", sel.recommendations], ["Source", sel.source]] as const).map(([h, t]) => (
              <section key={h} className="mb-3"><h3 className="font-semibold">{h}</h3><p className="whitespace-pre-wrap">{t || "—"}</p></section>))}
            <p className="mb-3 text-sm text-gray-600">GPS: {sel.lat.toFixed(6)}, {sel.lng.toFixed(6)}</p>
            <ul className="mb-3 flex flex-wrap gap-2">
              {sel.photos.map((p) => (<li key={p.url}><a href={p.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`Photo of ${sel.name}`} className="h-28 w-28 rounded object-cover" /></a></li>))}
            </ul>
            {user && <div className="flex gap-2">
              <button onClick={() => setDraft({ ...sel })} className="rounded bg-blue-700 px-3 py-2 text-white">Edit</button>
              <button onClick={() => remove(sel)} className="rounded border border-red-700 px-3 py-2 text-red-700">Delete</button></div>}
          </article>
        ) : (
          <>
            <input type="search" aria-label="Search locations" placeholder="Search locations…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-2 w-full rounded border p-2" />
            <div className="mb-2 flex gap-2">
              <select aria-label="Filter by category" value={cat} onChange={(e) => setCat(e.target.value)} className="min-w-0 flex-1 rounded border p-2">
                <option value="">All categories</option>{Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <select aria-label="Filter by status" value={stat} onChange={(e) => setStat(e.target.value)} className="min-w-0 flex-1 rounded border p-2">
                <option value="">All statuses</option>{Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
            </div>
            <ul className="mb-3 grid grid-cols-2 gap-1 text-xs" aria-label="Legend">
              {Object.values(STATUSES).map((s) => (<li key={s.label} className="flex items-center gap-1">
                <span className="inline-flex h-5 w-5 items-center justify-center font-bold text-white" style={{ background: s.color, borderRadius: s.radius }}>{s.glyph}</span>{s.label}</li>))}
            </ul>
            {user && <button onClick={() => { setDraft(blank(14.1975, 121.1535)); setSelId(undefined); setMsg(""); }} className="mb-3 rounded bg-blue-700 p-2 font-semibold text-white">+ Add location</button>}
            <p className="mb-1 text-sm text-gray-600">{shown.length} location(s)</p>
            <ul className="divide-y">
              {shown.map((l) => (<li key={l.id}><button onClick={() => setSelId(l.id)} className="flex w-full items-center gap-2 py-2 text-left">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center font-bold text-white" style={{ background: STATUSES[l.status].color, borderRadius: STATUSES[l.status].radius }}>{STATUSES[l.status].glyph}</span>
                <span><span className="block font-medium">{l.name}</span><span className="block text-xs text-gray-600">{CATEGORIES[l.category]} · {STATUSES[l.status].label}</span></span>
              </button></li>))}
            </ul>
          </>
        )}
      </aside>
    </div>
  );
}
