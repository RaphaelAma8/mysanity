import { json, listApprovedAds, submitAd } from "@/lib/db/api";
import { containsPrivateFields } from "@/lib/social/guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.has("mood") || url.searchParams.has("journal") || url.searchParams.has("checkin")) {
    return json({ ok: false, error: "Boards are the same for everyone." }, 400);
  }
  return listApprovedAds();
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (containsPrivateFields(body)) return json({ ok: false, error: "Boards can't include a journal or a mood check-in." }, 400);
  return submitAd(body);
}
