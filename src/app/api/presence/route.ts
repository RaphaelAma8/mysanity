import { authed, json, nearby, touchPresence } from "@/lib/db/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { player, error } = await authed(req);
  if (!player) return error;
  const map = new URL(req.url).searchParams.get("map") ?? "";
  return nearby(player.id, map.slice(0, 24));
}

export async function POST(req: Request) {
  const { player, error } = await authed(req);
  if (!player) return error;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ ok: false, error: "Missing place." }, 400);
  return touchPresence(player.id, body as { map?: string; x?: number; y?: number; emote?: string | null });
}
