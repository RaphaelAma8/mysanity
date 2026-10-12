import { addFriend, authed, listFriends } from "@/lib/db/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { player, error } = await authed(req);
  if (!player) return error;
  return listFriends(player.id);
}

export async function POST(req: Request) {
  const { player, error } = await authed(req);
  if (!player) return error;
  const body = await req.json().catch(() => null);
  const code = body && typeof body === "object" && "code" in body ? String((body as { code: unknown }).code) : "";
  return addFriend(player.id, code);
}
