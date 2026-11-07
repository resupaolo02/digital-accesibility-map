// Usage: npx tsx --env-file=.env.local scripts/setup.ts [username password]...
// Creates tables, seeds researched locations (once), upserts editor accounts.
import { neon } from "@neondatabase/serverless";
import { hashPassword } from "../lib/auth";

const sql = neon(process.env.DATABASE_URL!);

const SRC = "OpenStreetMap/Nominatim lookup; not yet visited. Coordinates are approximate.";
const seed = [
  ["Calamba City Hall Complex", "government", 14.1940522, 121.1596881, "Chipeco Avenue Extension / Bacnotan Road, Brgy. Real"],
  ["Rizal Monument (Chipeco Ave. Ext.)", "tourist", 14.195874, 121.1597906, "Landmark in Brgy. Real"],
  ["Real Elementary School", "school", 14.1985631, 121.1490689, "National Highway, Brgy. Real"],
  ["Calamba Medical Center", "health", 14.2064252, 121.152536, "Private hospital, National Highway"],
  ["SM City Calamba", "tourist", 14.2030913, 121.1549949, "Mall, SM City Calamba Bypass Road"],
] as const;

async function main() {
  await sql`CREATE TABLE IF NOT EXISTS locations (
    id serial PRIMARY KEY, name text NOT NULL, category text NOT NULL, status text NOT NULL DEFAULT 'needs_assessment',
    lat double precision NOT NULL, lng double precision NOT NULL,
    existing text NOT NULL DEFAULT '', barriers text NOT NULL DEFAULT '', recommendations text NOT NULL DEFAULT '',
    source text NOT NULL DEFAULT '', photos jsonb NOT NULL DEFAULT '[]',
    updated_by text, updated_at timestamptz NOT NULL DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS users (username text PRIMARY KEY, password_hash text NOT NULL)`;

  const [{ n }] = await sql`SELECT count(*)::int AS n FROM locations`;
  if (n === 0) {
    for (const [name, cat, lat, lng, note] of seed)
      await sql`INSERT INTO locations (name, category, lat, lng, existing, source)
        VALUES (${name}, ${cat}, ${lat}, ${lng}, ${note}, ${SRC})`;
    console.log(`seeded ${seed.length} locations`);
  }

  const args = process.argv.slice(2);
  for (let i = 0; i + 1 < args.length; i += 2) {
    await sql`INSERT INTO users (username, password_hash) VALUES (${args[i]}, ${hashPassword(args[i + 1])})
      ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`;
    console.log(`user ${args[i]} saved`);
  }
}
main();
