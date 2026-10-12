import { authed, readSave, saveSim } from "@/lib/db/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { player, error } = await authed(req);
  if (!player) return error;
  return readSave(player.id);
}

export async function PUT(req: Request) {
  const { player, error } = await authed(req);
  if (!player) return error;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ ok: false, error: "Missing save." }, { status: 400 });
  const record = body as { sim?: unknown; region?: unknown; journal?: unknown; checkins?: unknown };
  if ("journal" in record || "checkins" in record) {
    return Response.json({ ok: false, error: "Journal and check-ins stay on this device." }, { status: 400 });
  }
  return saveSim(player.id, record.sim, record.region);
}
