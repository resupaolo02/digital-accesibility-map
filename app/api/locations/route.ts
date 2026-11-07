import { sql } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { validate } from "@/lib/validate";

export async function GET() {
  return Response.json(await sql`SELECT * FROM locations ORDER BY name`);
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const v = validate(await req.json());
  if (!v) return new Response("Invalid data", { status: 400 });
  const [row] = await sql`INSERT INTO locations (name, category, status, lat, lng, existing, barriers, recommendations, source, photos, updated_by)
    VALUES (${v.name}, ${v.category}, ${v.status}, ${v.lat}, ${v.lng}, ${v.existing}, ${v.barriers}, ${v.recommendations}, ${v.source}, ${v.photos}::jsonb, ${user})
    RETURNING *`;
  return Response.json(row, { status: 201 });
}
