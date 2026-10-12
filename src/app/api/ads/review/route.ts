import { adminAuthorized, json, listPendingAds, reviewAd } from "@/lib/db/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = adminAuthorized(req);
  if (denied) return denied;
  return listPendingAds();
}

export async function POST(req: Request) {
  const denied = adminAuthorized(req);
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ ok: false, error: "Missing board." }, 400);
  const src = body as { id?: string; status?: string };
  return reviewAd(String(src.id ?? ""), String(src.status ?? ""));
}
