"use client";

import { LifeGame } from "@/components/world/LifeGame";
import { Loading } from "@/components/Parts";
import { useRequireProfile } from "@/components/HavenProvider";

export default function Play() {
  const ok = useRequireProfile();
  if (!ok) return <Loading />;
  return <LifeGame />;
}
