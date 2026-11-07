"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Login() {
  const [err, setErr] = useState("");
  const router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await fetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ username: f.get("username"), password: f.get("password") }),
    });
    if (r.ok) { router.push("/"); router.refresh(); }
    else setErr(await r.text());
  }
  return (
    <main className="mx-auto w-full max-w-sm p-6">
      <h1 className="mb-4 text-2xl font-bold">Editor login</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label>Username<input name="username" required autoComplete="username" className="mt-1 w-full rounded border p-2" /></label>
        <label>Password<input name="password" type="password" required autoComplete="current-password" className="mt-1 w-full rounded border p-2" /></label>
        {err && <p role="alert" className="text-red-700">{err}</p>}
        <button className="rounded bg-blue-700 p-2 font-semibold text-white">Log in</button>
        <Link href="/" className="text-blue-700 underline">Back to map</Link>
      </form>
    </main>
  );
}
