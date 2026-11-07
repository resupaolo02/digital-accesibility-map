"use client";
import { useState } from "react";
import Link from "next/link";

export default function Login() {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ username: f.get("username"), password: f.get("password") }),
      });
      // Full load, not router.push + refresh: the cookie is set, and the soft navigation raced it ("page couldn't load").
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional hard navigation
      if (r.ok) return window.location.assign("/");
      setErr(await r.text());
    } catch { setErr("Could not reach the server. Try again."); }
    setBusy(false);
  }
  return (
    <main className="mx-auto w-full max-w-sm p-6">
      <h1 className="mb-4 text-2xl font-bold">Editor login</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label>Username<input name="username" required autoComplete="username" className="mt-1 w-full rounded border bg-surface p-2" /></label>
        <label>Password<input name="password" type="password" required autoComplete="current-password" className="mt-1 w-full rounded border bg-surface p-2" /></label>
        {err && <p role="alert" className="text-red-700 dark:text-red-400">{err}</p>}
        <button disabled={busy} className="rounded bg-blue-700 p-2 font-semibold text-white disabled:opacity-60">{busy ? "Logging in…" : "Log in"}</button>
        <Link href="/" className="text-blue-700 dark:text-blue-300 underline">Back to map</Link>
      </form>
    </main>
  );
}
