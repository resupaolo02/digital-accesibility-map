"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORIES, FEATURES, LINE_CATEGORIES, STATUSES,
  type Category, type Feature, type FeatureType, type LatLng, type Loc, type Photo, type Status,
} from "@/lib/types";
import { tr, type Lang } from "@/lib/i18n";

const Map = dynamic(() => import("./Map"), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-sunken" /> });

type DraftForm = Omit<Loc, "id" | "updated_by" | "updated_at"> & { id?: number };
const CENTER: LatLng = [14.1975, 121.1535];
const blank = (): DraftForm => ({
  name: "", category: "other", status: "needs_assessment", lat: CENTER[0], lng: CENTER[1], path: null, features: [],
  existing: "", barriers: "", recommendations: "", source: "", photos: [],
});
const SHORT: Record<Status, string> = { existing: "Existing", needs_improvement: "Needs work", proposed: "Proposed", needs_assessment: "To assess" };

const inp = "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-base text-ink placeholder:text-muted md:text-sm";
const btn = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition active:scale-[.98]";
const btnDark = `${btn} bg-teal-800 text-white hover:bg-teal-700`;
const btnLight = `${btn} border border-line bg-surface text-ink hover:bg-sunken`;

function Glyph({ s, size = 24 }: { s: Status; size?: number }) {
  const st = STATUSES[s];
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center font-bold text-white"
      style={{ width: size, height: size, background: st.color, borderRadius: st.radius, fontSize: size * 0.6 }}>{st.glyph}</span>
  );
}

function resize(file: File, max = 1600): Promise<File> {
  return createImageBitmap(file).then((bmp) => {
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise<File>((res) => c.toBlob((b) => res(b ? new File([b], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file), "image/jpeg", 0.82));
  }).catch(() => file);
}

export default function App() {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("en");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [stat, setStat] = useState("");
  const [feat, setFeat] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [listOpen, setListOpen] = useState(false); // mobile: list view is opt-in, map stays clear
  const [selId, setSelId] = useState<number>();
  const [focusNonce, setFocusNonce] = useState(0);
  const [draft, setDraft] = useState<DraftForm | null>(null);
  const [msg, setMsg] = useState("");
  const [me, setMe] = useState<LatLng>();
  const [busy, setBusy] = useState(false);
  // bottom sheet (mobile)
  const [vh, setVh] = useState(800);
  const [isMobile, setIsMobile] = useState(false);
  const [snap, setSnap] = useState<"peek" | "half" | "full">("peek");
  const [dragH, setDragH] = useState<number | null>(null);
  const t = (s: string) => tr(lang, s);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage only exists on the client; reading it in render would break hydration
    if (localStorage.getItem("lang") === "fil") setLang("fil");
    const onResize = () => { setVh(window.innerHeight); setIsMobile(window.innerWidth < 768); };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => { localStorage.setItem("lang", lang); document.documentElement.lang = lang === "fil" ? "fil" : "en"; }, [lang]);

  const load = () => fetch("/api/locations").then((r) => r.json()).then((d) => { setLocs(d); setLoaded(true); })
    .catch(() => { setMsg("Could not load locations."); setLoaded(true); });
  useEffect(() => {
    load();
    fetch("/api/me").then((r) => r.json()).then((d) => setUser(d.user));
  }, []);

  const snapPx = { peek: 152, half: Math.round(vh * 0.5), full: vh - 56 };
  const sheetH = dragH ?? snapPx[snap];

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return locs.filter((l) =>
      (!cat || l.category === cat) && (!stat || l.status === stat) &&
      (!feat || l.category === feat || l.features.some((f) => f.type === feat)) &&
      (!needle || `${l.name} ${CATEGORIES[l.category]} ${l.existing} ${l.barriers} ${l.recommendations}`.toLowerCase().includes(needle)));
  }, [locs, q, cat, stat, feat]);
  const sel = locs.find((l) => l.id === selId);
  const sheetOn = !isMobile || !!draft || !!sel || listOpen;
  const bottomPx = isMobile && sheetOn ? snapPx[snap === "peek" ? "half" : snap] : 0;
  const filtered = !!(q || cat || stat || feat);
  const clearFilters = () => { setQ(""); setCat(""); setStat(""); setFeat(""); };

  function choose(id: number | undefined) {
    setSelId(id);
    if (id !== undefined) { setFocusNonce((n) => n + 1); setSnap("half"); }
  }
  function locate(then?: (p: LatLng) => void) {
    if (!navigator.geolocation) return setMsg("Location is not available on this device.");
    navigator.geolocation.getCurrentPosition(
      (p) => { const ll: LatLng = [p.coords.latitude, p.coords.longitude]; if (then) then(ll); else setMe(ll); },
      () => setMsg("Could not get your location. Check browser permission."), { enableHighAccuracy: true, timeout: 15000 });
  }

  async function save() {
    if (!draft) return;
    const isLine = LINE_CATEGORIES.includes(draft.category);
    if (isLine && (draft.path?.length ?? 0) < 2) return setMsg("Add at least 2 points on the map for this route.");
    const body = { ...draft, path: isLine ? draft.path : null };
    if (isLine && draft.path) { const m = draft.path[Math.floor(draft.path.length / 2)]; body.lat = m[0]; body.lng = m[1]; }
    setBusy(true);
    const r = await fetch(draft.id ? `/api/locations/${draft.id}` : "/api/locations", { method: draft.id ? "PUT" : "POST", body: JSON.stringify(body) });
    setBusy(false);
    if (!r.ok) return setMsg(`Save failed: ${await r.text()}`);
    const row: Loc = await r.json();
    setDraft(null); setMsg(""); await load(); choose(row.id);
  }
  async function remove(l: Loc) {
    if (!confirm(`${t("Delete")} "${l.name}"?`)) return;
    const r = await fetch(`/api/locations/${l.id}`, { method: "DELETE" });
    if (r.ok) { setSelId(undefined); setSnap("peek"); load(); } else setMsg("Delete failed.");
  }
  async function upload(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    const added: Photo[] = [];
    for (const f of Array.from(files)) {
      const body = new FormData(); body.append("file", await resize(f));
      const r = await fetch("/api/upload", { method: "POST", body });
      if (r.ok) added.push({ url: (await r.json()).url }); else setMsg(`Upload failed: ${await r.text()}`);
    }
    setBusy(false);
    setDraft((d) => d && { ...d, photos: [...d.photos, ...added] });
  }
  async function logout() { await fetch("/api/logout", { method: "POST" }); setUser(null); setDraft(null); }
  function startDraft(d: DraftForm) { setDraft(d); setSelId(undefined); setMsg(""); setSnap("half"); }

  const set = <K extends keyof DraftForm>(k: K, v: DraftForm[K]) => setDraft((d) => d && { ...d, [k]: v });
  const setFeature = (i: number, patch: Partial<Feature>) => setDraft((d) => d && { ...d, features: d.features.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  const draftIsLine = !!draft && LINE_CATEGORIES.includes(draft.category);
  const mapDraft = draft ? { category: draft.category, status: draft.status, lat: draft.lat, lng: draft.lng, path: draft.path ?? [], isLine: draftIsLine } : undefined;

  // --- sheet drag ---
  const drag = useRef<{ y: number; h: number; moved: boolean } | null>(null);
  const onDown = (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); drag.current = { y: e.clientY, h: snapPx[snap], moved: false }; };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    if (Math.abs(e.clientY - d.y) > 4) d.moved = true;
    setDragH(Math.min(snapPx.full, Math.max(snapPx.peek, d.h + d.y - e.clientY)));
  };
  const onUp = () => {
    const d = drag.current; drag.current = null; if (!d) return;
    if (!d.moved) { setSnap(snap === "peek" ? "half" : snap === "half" ? "full" : "peek"); setDragH(null); return; }
    const h = dragH ?? d.h;
    const best = (Object.keys(snapPx) as (keyof typeof snapPx)[]).reduce((a, b) => (Math.abs(snapPx[b] - h) < Math.abs(snapPx[a] - h) ? b : a));
    setSnap(best); setDragH(null);
  };

  const filterFields = (
    <div className="grid gap-2">
      <select aria-label={t("All categories")} value={cat} onChange={(e) => setCat(e.target.value)} className={inp}>
        <option value="">{t("All categories")}</option>{Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}</select>
      <select aria-label={t("All features")} value={feat} onChange={(e) => setFeat(e.target.value)} className={inp}>
        <option value="">{t("All features")}</option>{Object.entries(FEATURES).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}</select>
    </div>
  );
  const chips = (
    <div role="group" aria-label={t("Legend")} className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
      {(Object.keys(STATUSES) as Status[]).map((s) => (
        <button key={s} aria-pressed={stat === s} onClick={() => setStat(stat === s ? "" : s)} title={t(STATUSES[s].label)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-xs font-medium shadow-sm md:text-sm ${stat === s ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink"}`}>
          <Glyph s={s} size={24} />{t(SHORT[s])}</button>
      ))}
    </div>
  );
  const searchBox = (cls: string) => (
    <div className={`relative ${cls}`}>
      <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 fill-none stroke-current text-muted" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
      <input type="search" aria-label={t("Search places…")} placeholder={t("Search places…")} value={q} onChange={(e) => setQ(e.target.value)} className={`${inp} rounded-full pl-11 shadow-md`} />
    </div>
  );

  const account = (
    <div className="flex shrink-0 items-center gap-1.5">
      <button onClick={() => setLang(lang === "en" ? "fil" : "en")} aria-label="Switch language / Palitan ang wika" className={`${btnLight} px-3 text-xs`}>{lang === "en" ? "FIL" : "EN"}</button>
      {user ? <button onClick={logout} className={`${btnLight} px-3 text-xs`}>{t("Log out")}</button>
        : <Link href="/login" className={`${btnLight} px-3 text-xs`}>{t("Editor login")}</Link>}
    </div>
  );
  const header = (
    <header className="flex items-start justify-between gap-2 px-4 pt-1 md:pt-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-800 text-lg text-white">♿</span>
        <div className="min-w-0">
          <h1 className="text-base font-bold leading-tight md:text-lg">{t("Barangay Real Access")}</h1>
          <p className="hidden truncate text-xs text-muted md:block">{t("Accessibility map · Real, Calamba, Laguna")}</p>
        </div>
      </div>
      {account}
    </header>
  );

  const browse = (
    <div className="flex flex-col gap-3 px-4 pb-6">
      <button onClick={() => setListOpen(false)} className={`${btnLight} md:hidden`}>🗺 {t("Show map")}</button>
      <div className="hidden flex-col gap-3 md:flex">
        {searchBox("")}{chips}{filterFields}
      </div>
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{shown.length} {t("location(s)")}</span>
        {filtered && <button onClick={clearFilters} className="font-medium underline">{t("Clear filters")}</button>}
      </div>
      {user && <button onClick={() => startDraft(blank())} className={btnDark}>＋ {t("Add location")}</button>}
      {loaded && shown.length === 0 && <p className="rounded-xl bg-sunken p-4 text-sm">{t("No locations match your filters.")}</p>}
      <ul className="-mx-1">
        {shown.map((l) => (
          <li key={l.id}>
            <button onClick={() => choose(l.id)} className="flex min-h-14 w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-hover">
              <Glyph s={l.status} size={32} />
              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{l.name}</span>
                <span className="block truncate text-xs text-muted">{t(CATEGORIES[l.category])} · {t(STATUSES[l.status].label)}</span></span>
              <span aria-hidden className="text-xl text-slate-400">›</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <a className="underline" href="/api/export">{t("Download data (CSV)")}</a>
        <a className="underline" href="/api/export?format=geojson">{t("Download map data (GeoJSON)")}</a>
      </p>
    </div>
  );

  const detail = sel && (
    <article className="flex flex-col gap-4 px-4 pb-8">
      <button onClick={() => { setSelId(undefined); setSnap("half"); }} className="self-start text-sm font-medium underline">← {t("Back to all places")}</button>
      <div>
        <h2 className="text-xl font-bold leading-tight">{sel.name}</h2>
        <p className="text-sm text-muted">{t(CATEGORIES[sel.category])}</p>
        <p className="mt-2 inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-semibold text-white" style={{ background: STATUSES[sel.status].color }}>
          <span aria-hidden className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface/25">{STATUSES[sel.status].glyph}</span>{t(STATUSES[sel.status].label)}</p>
      </div>
      <a className={btnDark} target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${sel.lat},${sel.lng}&travelmode=walking`}>➜ {t("Get directions")}</a>
      {sel.features.length > 0 && (
        <section><h3 className="mb-2 font-semibold">{t("Accessibility features")}</h3>
          <ul className="grid gap-2">{sel.features.map((f, i) => (
            <li key={i} className="flex items-start gap-3 rounded-xl border border-line p-3">
              <Glyph s={f.status} size={28} />
              <div className="min-w-0"><p className="font-medium">{t(FEATURES[f.type])}</p><p className="text-xs text-muted">{t(STATUSES[f.status].label)}</p>
                {f.note && <p className="mt-1 text-sm">{f.note}</p>}</div>
            </li>))}</ul></section>)}
      {([["Existing accessibility features", sel.existing], ["Barriers / missing facilities", sel.barriers],
        ["Recommended improvements", sel.recommendations], ["Source", sel.source]] as const).map(([h, x]) => x && (
        <section key={h}><h3 className="font-semibold">{t(h)}</h3><p className="whitespace-pre-wrap text-sm">{x}</p></section>))}
      {sel.photos.length > 0 && (
        <section><h3 className="mb-2 font-semibold">{t("Photos")}</h3>
          <ul className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4">
            {sel.photos.map((p) => (<li key={p.url} className="shrink-0 snap-start"><a href={p.url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`${sel.name}`} className="h-36 w-48 rounded-xl object-cover" /></a></li>))}
          </ul></section>)}
      <p className="text-xs text-muted">GPS {sel.lat.toFixed(6)}, {sel.lng.toFixed(6)}{sel.updated_by ? ` · ${sel.updated_by}, ${new Date(sel.updated_at).toLocaleDateString()}` : ""}</p>
      {user && <div className="flex gap-2">
        <button onClick={() => startDraft({ ...sel, path: sel.path })} className={`${btnDark} flex-1`}>{t("Edit")}</button>
        <button onClick={() => remove(sel)} className={`${btn} flex-1 border border-red-700 dark:border-red-400 text-red-700 dark:text-red-400`}>{t("Delete")}</button></div>}
    </article>
  );

  const form = draft && (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="flex flex-col gap-4 px-4 pb-6">
      <h2 className="text-xl font-bold">{draft.id ? t("Edit location") : t("New location")}</h2>
      <label className="grid gap-1 text-sm font-medium">{t("Name")}<input required value={draft.name} onChange={(e) => set("name", e.target.value)} className={inp} /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-sm font-medium">{t("Category")}
          <select value={draft.category} onChange={(e) => { const c = e.target.value as Category; setDraft((d) => d && { ...d, category: c, path: LINE_CATEGORIES.includes(c) ? d.path ?? [] : null }); }} className={inp}>
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-medium">{t("Status")}
          <select value={draft.status} onChange={(e) => set("status", e.target.value as Status)} className={inp}>
            {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{t(v.label)}</option>)}</select></label>
      </div>
      <fieldset className="grid gap-2 rounded-xl bg-sunken p-3">
        <legend className="sr-only">GPS</legend>
        <p className="text-sm">{draftIsLine ? t("Tap the map to add points along the route.") : t("Tap the map or drag the pin to set the position.")}</p>
        {draftIsLine ? (
          <p className="text-sm font-medium">{draft.path?.length ?? 0} point(s)</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-xs font-medium">{t("Latitude")}<input type="number" step="any" required value={draft.lat} onChange={(e) => set("lat", Number(e.target.value))} className={inp} /></label>
            <label className="grid gap-1 text-xs font-medium">{t("Longitude")}<input type="number" step="any" required value={draft.lng} onChange={(e) => set("lng", Number(e.target.value))} className={inp} /></label>
          </div>)}
        <div className="flex gap-2">
          <button type="button" className={`${btnLight} flex-1 text-xs`} onClick={() => locate((p) => draftIsLine ? set("path", [...(draft.path ?? []), p]) : setDraft((d) => d && { ...d, lat: p[0], lng: p[1] }))}>◎ {t("Use my current location")}</button>
          {draftIsLine && <button type="button" className={`${btnLight} text-xs`} onClick={() => set("path", (draft.path ?? []).slice(0, -1))}>{t("Undo last point")}</button>}
        </div>
      </fieldset>

      <section className="grid gap-2">
        <h3 className="font-semibold">{t("Accessibility features")}</h3>
        {draft.features.map((f, i) => (
          <div key={i} className="grid gap-2 rounded-xl border border-line p-3">
            <div className="grid grid-cols-2 gap-2">
              <select aria-label={t("Accessibility features")} value={f.type} onChange={(e) => setFeature(i, { type: e.target.value as FeatureType })} className={inp}>
                {Object.entries(FEATURES).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}</select>
              <select aria-label={t("Status")} value={f.status} onChange={(e) => setFeature(i, { status: e.target.value as Status })} className={inp}>
                {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{t(v.label)}</option>)}</select>
            </div>
            <input aria-label={t("Note")} placeholder={t("Note")} value={f.note} onChange={(e) => setFeature(i, { note: e.target.value })} className={inp} />
            <button type="button" onClick={() => set("features", draft.features.filter((_, j) => j !== i))} className="self-end text-sm text-red-700 dark:text-red-400 underline">{t("Remove")}</button>
          </div>))}
        <button type="button" className={btnLight} onClick={() => set("features", [...draft.features, { type: "ramp", status: "existing", note: "" }])}>＋ {t("Add a feature")}</button>
      </section>

      {([["existing", "Existing accessibility features"], ["barriers", "Barriers / missing facilities"], ["recommendations", "Recommended improvements"], ["source", "Source / fieldwork notes"]] as const).map(([k, label]) => (
        <label key={k} className="grid gap-1 text-sm font-medium">{t(label)}
          <textarea rows={3} value={draft[k]} onChange={(e) => set(k, e.target.value)} className={inp} /></label>))}

      <div className="grid gap-2">
        <label className={`${btnLight} cursor-pointer`}>📷 {t("Add photos")}
          <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => upload(e.target.files)} /></label>
        <ul className="flex flex-wrap gap-2">
          {draft.photos.map((p, i) => (
            <li key={p.url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-20 w-20 rounded-xl object-cover" />
              <button type="button" aria-label={t("Remove")} onClick={() => set("photos", draft.photos.filter((_, j) => j !== i))}
                className="absolute -right-2 -top-2 h-7 w-7 rounded-full bg-red-700 text-white">×</button>
            </li>))}
        </ul>
      </div>
      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-line bg-surface px-4 py-3">
        <button disabled={busy} className={`${btnDark} flex-1 disabled:opacity-50`}>{busy ? "…" : t("Save")}</button>
        <button type="button" onClick={() => { setDraft(null); setMsg(""); }} className={`${btnLight} flex-1`}>{t("Cancel")}</button>
      </div>
    </form>
  );

  return (
    <div className="relative h-dvh w-full overflow-hidden" style={{ "--ctl-bottom": isMobile && sheetOn ? `${sheetH}px` : "0px" } as React.CSSProperties}>
      <main aria-label="Map" className="absolute inset-0">
        <Map locs={shown} selectedId={selId} focusNonce={focusNonce} bottomPx={bottomPx} leftPx={isMobile ? 0 : 432} me={me}
          onSelect={(id) => { setDraft(null); choose(id); }}
          onPick={draft ? (lat, lng) => setDraft((d) => d && (LINE_CATEGORIES.includes(d.category) ? { ...d, path: [...(d.path ?? []), [lat, lng]] } : { ...d, lat, lng })) : undefined}
          draft={mapDraft}
          onDrag={(lat, lng) => setDraft((d) => d && { ...d, lat, lng })}
          onDragVertex={(i, lat, lng) => setDraft((d) => d && { ...d, path: (d.path ?? []).map((p, j) => (j === i ? [lat, lng] : p)) })} />
      </main>

      {/* mobile top bar */}
      {!draft && (
        <div role="search" aria-label={t("Search places…")} className="absolute inset-x-3 top-3 z-[500] flex flex-col gap-2 md:hidden">
          <div className="flex gap-2">
            {searchBox("flex-1")}
            <button onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters} aria-label={t("Menu")} className={`${btnLight} rounded-full px-4 text-lg shadow-md`}>☰{(cat || feat) && <span aria-hidden> •</span>}</button>
          </div>
          {showFilters && (
            <div className="grid gap-3 rounded-2xl bg-surface p-3 shadow-lg">
              {filterFields}
              <button onClick={() => { setListOpen(true); setSnap("half"); setShowFilters(false); }} className={btnDark}>☰ {t("List view")}</button>
              {account}
            </div>)}
          {chips}
        </div>
      )}

      {/* locate-me */}
      <button onClick={() => locate()} aria-label={t("Show my location")} title={t("Show my location")}
        className="absolute right-3 z-[500] flex h-12 w-12 items-center justify-center rounded-full bg-surface text-xl shadow-lg md:bottom-36 md:right-[10px]"
        style={{ bottom: isMobile ? (sheetOn ? sheetH : 0) + 12 : undefined }}>◎</button>

      {/* panel (desktop) / bottom sheet (mobile) */}
      <aside aria-label="Locations"
        className={`${sheetOn ? "" : "max-md:hidden"} fixed inset-x-0 bottom-0 z-[600] flex h-[var(--sheet-h)] flex-col rounded-t-3xl bg-surface text-ink shadow-[0_-8px_30px_rgba(0,0,0,.2)] md:absolute md:inset-x-auto md:bottom-4 md:left-4 md:top-4 md:h-auto md:w-[26rem] md:rounded-2xl md:shadow-2xl`}
        style={{ "--sheet-h": `${sheetH}px`, transition: dragH === null ? "height .2s ease" : "none" } as React.CSSProperties}>
        <div role="button" tabIndex={0} aria-label={t("Open list")} aria-expanded={snap !== "peek"}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSnap(snap === "peek" ? "half" : snap === "half" ? "full" : "peek"); } }}
          className="flex shrink-0 cursor-grab touch-none justify-center py-3 md:hidden"><span className="h-1.5 w-12 rounded-full bg-line" /></div>
        {!draft && !sel && header}
        {msg && <p role="status" className="mx-4 mt-2 rounded-xl bg-amber-100 p-3 text-slate-900 text-sm">{msg}</p>}
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain pt-2">
          {draft ? form : sel ? detail : browse}
        </div>
      </aside>
    </div>
  );
}
