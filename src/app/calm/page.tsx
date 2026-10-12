"use client";

import Link from "next/link";
import { Loading, TopNav } from "@/components/Parts";
import { useRequireProfile } from "@/components/HavenProvider";

const ITEMS = [
  { href: "/breathe", icon: "🌬️", title: "Breathe", sub: "A slow, steady rhythm for 1 to 5 minutes." },
  { href: "/ground", icon: "🌿", title: "Ground yourself", sub: "The 5-4-3-2-1 senses exercise." },
  { href: "/journal", icon: "📓", title: "Journal", sub: "Write privately. It stays on this device." },
  { href: "/checkin", icon: "🧭", title: "Check in with yourself", sub: "Notice how you really are. Not part of the game, and never scored." },
];

export default function Calm() {
  const ok = useRequireProfile();
  if (!ok) return <Loading />;
  return (
    <div>
      <TopNav />
      <h1 className="font-display text-3xl font-semibold">Calm corner</h1>
      <p className="mb-5 mt-1 text-muted">These are real skills you can use any time, in the game or in your own day. Doing them in the game also calms your character a little.</p>
      <ul className="grid gap-2">
        {ITEMS.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="card flex items-center gap-4 hover:bg-surface-2">
              <span aria-hidden className="text-3xl">{i.icon}</span>
              <span><span className="block text-lg font-semibold">{i.title}</span><span className="text-sm text-muted">{i.sub}</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
