import { put } from "@vercel/blob";
import { getUser } from "@/lib/auth";

export async function POST(req: Request) {
  if (!(await getUser())) return new Response("Unauthorized", { status: 401 });
  const file = (await req.formData()).get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 8_000_000)
    return new Response("Image up to 8 MB required", { status: 400 });
  const blob = await put(`photos/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`, file, { access: "public" });
  return Response.json({ url: blob.url });
}
