import { authed, createPlayer, deletePlayer, json, publicPlayer } from "@/lib/db/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ ok: false, error: "Missing details." }, 400);
  return createPlayer(body as { displayName?: string; avatar?: unknown; region?: string });
}

export async function GET(req: Request) {
  const { player, error } = await authed(req);
  if (!player) return error;
  return json({ ok: true, player: publicPlayer(player) });
}

export async function DELETE(req: Request) {
  const { player, error } = await authed(req);
  if (!player) return error;
  return deletePlayer(player.id);
}
