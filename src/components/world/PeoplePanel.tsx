"use client";

import { useEffect, useState } from "react";
import { CrisisNotice } from "@/components/Parts";
import { cloudFetch, loadCloud, saveCloud, type CloudSession } from "@/lib/cloud/session";
import { KIND_PRESETS } from "@/lib/social/presets";
import type { Avatar, Sim } from "@/lib/sim/types";

interface Friend { id: string; displayName: string; around: boolean }
interface Note { id: string; fromName: string; emoji: string; text: string }

export function PeoplePanel({ open, region, nickname, avatar, sim, onClose }: {
  open: boolean;
  region: string;
  nickname: string;
  avatar: Avatar;
  sim: Sim;
  onClose: () => void;
}) {
  const [database, setDatabase] = useState<boolean | null>(null);
  const [session, setSession] = useState<CloudSession | null>(null);
  const [name, setName] = useState(nickname);
  const [crisis, setCrisis] = useState(false);
  const [message, setMessage] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [code, setCode] = useState("");
  const [confirmLoad, setConfirmLoad] = useState(false);

  useEffect(() => {
    if (!open) return;
    let stop = false;
    cloudFetch("/api/status", null).then(({ data }) => {
      if (stop) return;
      setSession(loadCloud());
      setDatabase(data.database === true);
    }).catch(() => {
      if (stop) return;
      setSession(loadCloud());
      setDatabase(false);
    });
    return () => { stop = true; };
  }, [open]);

  useEffect(() => {
    if (!open || !session) return;
    let stop = false;
    const pull = async () => {
      const [f, n] = await Promise.all([
        cloudFetch("/api/friends", session.token),
        cloudFetch("/api/notes", session.token),
      ]);
      if (stop) return;
      setFriends(Array.isArray(f.data.friends) ? f.data.friends as Friend[] : []);
      setNotes(Array.isArray(n.data.notes) ? n.data.notes as Note[] : []);
    };
    void pull();
    return () => { stop = true; };
  }, [open, session]);

  if (!open) return null;

  const join = async () => {
    setCrisis(false);
    const { data, status } = await cloudFetch("/api/account", null, {
      method: "POST",
      body: JSON.stringify({ displayName: name || nickname || "Neighbour", avatar, region }),
    });
    if (data.crisis || status === 422) { setCrisis(true); setMessage(String(data.error ?? "")); return; }
    if (!data.ok || typeof data.token !== "string") { setMessage(String(data.error ?? "The town is not connected yet.")); return; }
    const player = data.player as { id: string; friendCode: string; displayName: string };
    const next: CloudSession = { token: data.token, id: player.id, friendCode: player.friendCode, displayName: player.displayName, share: false };
    saveCloud(next);
    setSession(next);
    setMessage("You are in the town. Nothing is shared until you turn it on. Your journal stays on this device.");
  };

  const toggleShare = (share: boolean) => {
    if (!session) return;
    const next = { ...session, share };
    saveCloud(next);
    setSession(next);
    setMessage(share ? "People in public places can see you. Your home stays private." : "You are hidden again. Maya and Dev are still here.");
  };

  const pushSave = async () => {
    if (!session) return;
    const { data } = await cloudFetch("/api/save", session.token, { method: "PUT", body: JSON.stringify({ sim, region }) });
    setMessage(data.ok ? "Character saved to the town. Journal and check-ins were not included." : String(data.error ?? "Could not save."));
  };

  const pullSave = async () => {
    if (!session) return;
    const { data } = await cloudFetch("/api/save", session.token);
    const remote = data.sim;
    if (!remote || typeof remote !== "object") { setMessage("There is no cloud character yet."); return; }
    const { update } = await import("@/lib/store");
    const { sanitizeSim } = await import("@/lib/state");
    const clean = sanitizeSim(remote);
    if (!clean) { setMessage("That save could not be read."); return; }
    update((s) => ({ ...s, sim: clean }));
    setConfirmLoad(false);
    setMessage("Loaded the town copy of your character. Your journal is unchanged.");
  };

  const add = async () => {
    if (!session) return;
    const { data } = await cloudFetch("/api/friends", session.token, { method: "POST", body: JSON.stringify({ code }) });
    setMessage(data.ok ? `Friends with ${(data.friend as { displayName?: string } | undefined)?.displayName ?? "them"}.` : String(data.error ?? "Could not add them."));
    if (data.ok) {
      const f = await cloudFetch("/api/friends", session.token);
      setFriends(Array.isArray(f.data.friends) ? f.data.friends as Friend[] : []);
      setCode("");
    }
  };

  const note = async (toId: string, preset: string) => {
    if (!session) return;
    const { data } = await cloudFetch("/api/notes", session.token, { method: "POST", body: JSON.stringify({ toId, preset }) });
    setMessage(data.ok ? "Sent. Kind notes are picked from the list, so there is nothing to moderate after the fact." : String(data.error ?? "Could not send."));
  };

  const leave = async () => {
    if (session) await cloudFetch("/api/account", session.token, { method: "DELETE" });
    saveCloud(null);
    setSession(null);
    setFriends([]);
    setNotes([]);
    setMessage("Removed from the town on this device.");
  };

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 max-h-[78dvh] overflow-y-auto rounded-t-3xl border border-line bg-surface p-4 pb-28 shadow-2xl" role="dialog" aria-label="People">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">People</h2>
        <button className="btn ghost" onClick={onClose} autoFocus>Close</button>
      </div>
      <p className="text-sm text-muted">Preset kind notes only. No open chat. Your journal and mood check-ins never leave this device.</p>
      {message && <p className="mt-3 rounded-2xl bg-surface-2 p-3" role="status">{message}</p>}
      {crisis && <CrisisNotice />}

      {database === null && <p className="mt-4 text-muted">Looking for the town…</p>}
      {database === false && (
        <p className="mt-4">This town is just yours until a database is connected. Renée, Omar, Maya and Dev are still here, and the whole game works.</p>
      )}
      {database && !session && (
        <form className="mt-4 grid gap-2" onSubmit={(e) => { e.preventDefault(); void join(); }}>
          <label htmlFor="town-name" className="font-semibold">What should people call you?</label>
          <input id="town-name" value={name} onChange={(e) => setName(e.target.value.slice(0, 20))} className="rounded-2xl border border-line bg-surface p-3 text-lg text-ink" autoComplete="off" />
          <button className="btn" type="submit">Join the town</button>
          <p className="text-sm text-muted">You get a private key on this device. You can leave whenever you want.</p>
        </form>
      )}
      {database && session && (
        <div className="mt-4 grid gap-4">
          <p>Your friend code is <strong className="font-display text-xl tracking-widest">{session.friendCode}</strong></p>
          <label className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 p-3">
            <span><span className="block font-semibold">Let people see me</span><span className="text-sm text-muted">Only in public places. Never inside your home.</span></span>
            <input type="checkbox" role="switch" checked={session.share} onChange={(e) => toggleShare(e.target.checked)} className="h-7 w-12 accent-[#e7a322]" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className="btn ghost" onClick={() => void pushSave()}>Save character</button>
            {!confirmLoad ? <button className="btn ghost" onClick={() => setConfirmLoad(true)}>Load character</button> : (
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm">Replace the character on this device? Your journal stays.</span>
                <button className="btn" onClick={() => void pullSave()}>Yes, load it</button>
              </span>
            )}
          </div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void add(); }}>
            <label className="sr-only" htmlFor="friend-code">Friend code</label>
            <input id="friend-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))} placeholder="Friend code" className="min-w-0 flex-1 rounded-2xl border border-line bg-surface p-3 text-ink" />
            <button className="btn" type="submit">Add</button>
          </form>
          <ul className="grid gap-3">
            {friends.map((f) => (
              <li key={f.id} className="rounded-2xl bg-surface-2 p-3">
                <p className="font-semibold">{f.displayName} {f.around ? <span className="text-sm font-normal text-aurora">· around</span> : null}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {KIND_PRESETS.map((p) => (
                    <button key={p.id} className="rounded-full bg-surface px-3 py-1 text-sm ring-1 ring-line" onClick={() => void note(f.id, p.id)}>{p.emoji} {p.label}</button>
                  ))}
                </div>
              </li>
            ))}
            {friends.length === 0 && <li className="text-sm text-muted">No friends yet. Share your code with someone you trust.</li>}
          </ul>
          {notes.length > 0 && (
            <ul className="grid gap-2" aria-label="Kind notes">
              {notes.map((n) => <li key={n.id} className="rounded-2xl bg-surface-2 p-3">{n.emoji} {n.fromName} {n.text}</li>)}
            </ul>
          )}
          <button className="btn ghost" onClick={() => void leave()}>Leave the town on this device</button>
        </div>
      )}
    </div>
  );
}
