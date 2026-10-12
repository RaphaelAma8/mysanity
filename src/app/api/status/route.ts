import { countAround } from "@/lib/db/api";
import { databaseConfigured } from "@/lib/social/guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const database = databaseConfigured();
  if (!database) return Response.json({ ok: true, database: false, around: 0 });
  try {
    const around = await countAround();
    return Response.json({ ok: true, database: true, around });
  } catch {
    return Response.json({ ok: true, database: true, around: 0 });
  }
}
