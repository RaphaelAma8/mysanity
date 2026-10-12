"use client";

import { useState } from "react";
import { TopNav } from "@/components/Parts";

interface Pending {
  id: string;
  businessName: string;
  line: string;
  detail: string;
  contact: string;
  kind?: string;
  createdAt: string;
}

/** The review key is typed here. It is never written into the app. */
export default function ReviewBoards() {
  const [token, setToken] = useState("");
  const [ads, setAds] = useState<Pending[]>([]);
  const [note, setNote] = useState<string | null>(null);

  async function load(e?: React.FormEvent) {
    e?.preventDefault();
    setNote(null);
    const res = await fetch("/api/ads/review", { headers: { authorization: `Bearer ${token}` } });
    const data = await res.json() as { ok?: boolean; error?: string; ads?: Pending[] };
    if (!data.ok) { setNote(data.error ?? "Could not open the queue."); setAds([]); return; }
    setAds(data.ads ?? []);
    setNote(data.ads?.length ? null : "Nothing is waiting.");
  }

  async function decide(id: string, status: "approved" | "rejected") {
    const res = await fetch("/api/ads/review", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json() as { ok?: boolean; error?: string };
    if (!data.ok) { setNote(data.error ?? "That did not save."); return; }
    setAds((list) => list.filter((ad) => ad.id !== id));
  }

  return (
    <div>
      <TopNav />
      <h1 className="font-display text-3xl font-semibold">Board review</h1>
      <p className="mt-2 text-muted">Paste the review key from the host&apos;s <code>ADMIN_TOKEN</code> setting. Approved street boards, songs, and businesses show for everyone. Nothing here is charged. A payment provider is not connected.</p>
      <form className="mt-4 grid gap-3" onSubmit={(e) => void load(e)}>
        <label className="text-sm font-semibold" htmlFor="key">Review key</label>
        <input id="key" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" className="rounded-2xl border border-line bg-surface p-3 text-lg" />
        <button className="btn" disabled={token.length < 16}>Show the queue</button>
      </form>
      {note && <p className="mt-3 text-sm">{note}</p>}
      <ul className="mt-4 grid gap-3">
        {ads.map((ad) => (
          <li key={ad.id} className="card">
            <p className="font-display text-xl font-semibold">{ad.businessName}</p>
            <p className="text-sm text-muted">{ad.kind === "song" ? "Song" : ad.kind === "business" ? "Business" : "Street board"}</p>
            <p>{ad.line}</p>
            {ad.detail && <p className="text-sm text-muted">{ad.detail}</p>}
            {ad.contact && <p className="text-sm">{ad.contact}</p>}
            <div className="mt-3 flex gap-2">
              <button className="btn" onClick={() => void decide(ad.id, "approved")}>Approve</button>
              <button className="btn ghost" onClick={() => void decide(ad.id, "rejected")}>Reject</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
