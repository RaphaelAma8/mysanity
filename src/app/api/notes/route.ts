import { authed, json, listNotes, sendNote } from "@/lib/db/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { player, error } = await authed(req);
  if (!player) return error;
  return listNotes(player.id);
}

export async function POST(req: Request) {
  const { player, error } = await authed(req);
  if (!player) return error;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ ok: false, error: "Pick a kind note." }, 400);
  const record = body as { toId?: unknown; preset?: unknown; text?: unknown };
  if ("text" in record) return json({ ok: false, error: "Notes are chosen from the list. There is no open chat." }, 400);
  return sendNote(player.id, String(record.toId ?? ""), String(record.preset ?? ""));
}
