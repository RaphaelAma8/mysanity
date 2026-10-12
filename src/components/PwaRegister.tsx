"use client";

import { useEffect } from "react";

/** Registers the offline shell in production. API calls are never cached. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => { /* install is optional */ });
  }, []);
  return null;
}
