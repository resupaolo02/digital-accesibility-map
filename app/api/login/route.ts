import { sql } from "@/lib/db";
import { checkPassword, createSession } from "@/lib/auth";

// shortcut: no rate limit, add Vercel Firewall rate-limit rule on /api/login if abused
export async function POST(req: Request) {
  const { username, password } = await req.json();
  const [u] = await sql`SELECT password_hash FROM users WHERE username = ${String(username)}`;
  if (!u || !checkPassword(String(password), u.password_hash))
    return new Response("Invalid username or password", { status: 401 });
  await createSession(username);
  return Response.json({ user: username });
}
