import { sql } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { validate } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const v = validate(await req.json());
  if (!v) return new Response("Invalid data", { status: 400 });
  const [row] = await sql`UPDATE locations SET name=${v.name}, category=${v.category}, status=${v.status}, lat=${v.lat}, lng=${v.lng},
    path=${v.path}::jsonb, features=${v.features}::jsonb,
    existing=${v.existing}, barriers=${v.barriers}, recommendations=${v.recommendations}, source=${v.source},
    photos=${v.photos}::jsonb, updated_by=${user}, updated_at=now() WHERE id=${Number(id)} RETURNING *`;
  return row ? Response.json(row) : new Response("Not found", { status: 404 });
}

export async function DELETE(_: Request, ctx: Ctx) {
  if (!(await getUser())) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  await sql`DELETE FROM locations WHERE id=${Number(id)}`;
  return new Response(null, { status: 204 });
}
