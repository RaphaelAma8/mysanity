"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loading, TopNav } from "@/components/Parts";
import { useHaven, useRequireProfile } from "@/components/HavenProvider";
import { RESOURCES_VERIFIED } from "@/data/resources";
import { cloudFetch, loadCloud } from "@/lib/cloud/session";
import { exportJson } from "@/lib/state";
import { update } from "@/lib/store";

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label className="card flex cursor-pointer items-center justify-between gap-4">
      <span><span className="block font-semibold">{label}</span><span className="text-sm text-muted">{hint}</span></span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => onChange(e.target.checked)} className="h-7 w-12 accent-[#f6c26b]" />
    </label>
  );
}

export default function Settings() {
  const ok = useRequireProfile();
  const { state, openHelp, reset } = useHaven();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  if (!ok) return <Loading />;

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportJson(state)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = "mysanity-my-data.json"; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div>
      <TopNav />
      <h1 className="font-display text-3xl font-semibold">Settings</h1>
      <div className="mt-5 grid gap-2">
        <Toggle on={state.settings.quiet} label="Quiet mode" hint="Turns off all animation and motion." onChange={(v) => update((s) => ({ ...s, settings: { ...s.settings, quiet: v } }))} />
        <Toggle on={state.settings.largeText} label="Larger text" hint="Makes everything a bit bigger." onChange={(v) => update((s) => ({ ...s, settings: { ...s.settings, largeText: v } }))} />
      </div>

      <h2 className="mt-8 font-display text-xl font-semibold">Your data</h2>
      <p className="mt-1 text-muted">Your journal and mood check-ins stay on this device. They are never uploaded, and they are never used to choose what you see. Street boards are local businesses the owner has approved. They look the same for everyone, and they do not appear in the calm corner or on help screens. There are no trackers and no real-money purchases.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn ghost" onClick={download}>Download my data</button>
        {!confirm ? <button className="btn ghost" onClick={() => setConfirm(true)}>Delete all my data</button> : (
          <span className="flex flex-wrap items-center gap-2 rounded-2xl border border-softred/60 p-2">
            <span>This removes your journal, check-ins and character on this device. If you joined the town, it also asks the server to forget that key.</span>
            <button className="btn" onClick={() => {
              const session = loadCloud();
              const finish = () => { reset(); router.replace("/"); };
              if (!session) { finish(); return; }
              cloudFetch("/api/account", session.token, { method: "DELETE" }).finally(finish);
            }}>Yes, delete everything</button>
            <button className="btn ghost" onClick={() => setConfirm(false)}>Keep it</button>
          </span>
        )}
      </div>

      <h2 className="mt-8 font-display text-xl font-semibold">Add to your home screen</h2>
      <div className="card mt-2 text-muted">
        <p>mysanity can sit on your phone like an app. On iPhone: Share, then Add to Home Screen. On Android: the browser menu, then Install app or Add to Home screen.</p>
      </div>

      <h2 className="mt-8 font-display text-xl font-semibold">About and safety</h2>
      <div className="card mt-2 grid gap-2 text-muted">
        <p>This is a calm place for everyday coping skills. <strong className="text-ink">It is not therapy, medical advice or a crisis service</strong>, and it can&apos;t tell you whether you are okay.</p>
        <p>If you are struggling, please reach out to a person. Support is free and available any time.</p>
        <div><button className="btn" onClick={openHelp}>Get help now</button></div>
        <p className="text-sm">Crisis numbers last checked {RESOURCES_VERIFIED}. Postcards and activities are written for this app and are not clinical advice.</p>
      </div>
    </div>
  );
}
