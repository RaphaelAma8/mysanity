import { describe, expect, it } from "vitest";
import { KIND_PRESETS, EMOTES, presetById } from "../src/lib/social/presets";
import { cloudSim, containsPrivateFields, databaseConfigured, moderatePetName, moderatePublicName } from "../src/lib/social/guard";
import { newSim } from "../src/lib/sim/engine";
import { DEFAULT_AVATAR, CLOUD_KEY, clearAllData, type KV } from "../src/lib/state";
import { FRIENDS, HOME_ACTIONS, ITEMS, JOBS } from "../src/lib/sim/data";

class Mem implements KV {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}

describe("shared town stays kind and private", () => {
  it("offers only preset notes, never an open message", () => {
    expect(KIND_PRESETS.length).toBeGreaterThanOrEqual(4);
    expect(EMOTES.length).toBeGreaterThanOrEqual(4);
    for (const p of KIND_PRESETS) {
      expect(presetById(p.id)?.text).toBe(p.text);
      expect(p.text).not.toMatch(/\b(cure|treat|diagnos|therapy|streak|hurry|sale)\b/i);
    }
    expect(presetById("nope")).toBeNull();
  });

  it("refuses crisis language and hostile words in a public name, and offers help", () => {
    expect(moderatePublicName("Asha").ok).toBe(true);
    const crisis = moderatePublicName("I want to die");
    expect(crisis.ok).toBe(false);
    if (!crisis.ok) expect(crisis.crisis).toBe(true);
    const rude = moderatePublicName("you retard");
    expect(rude.ok).toBe(false);
    if (!rude.ok) expect(rude.crisis).toBe(false);
    expect(moderatePublicName("a").ok).toBe(false);
    const pet = moderatePetName("I want to die");
    expect(pet.ok).toBe(false);
    if (!pet.ok) expect(pet.reason).toMatch(/9-8-8/);
    const emptyName = moderatePetName("");
    expect(emptyName.ok).toBe(true);
    if (emptyName.ok) expect(emptyName.name).toBe("Miso");
  });

  it("never accepts a journal or a check-in as a cloud save", () => {
    const sim = newSim(DEFAULT_AVATAR, new Date("2026-10-01"));
    expect(containsPrivateFields({ sim, journal: [{ text: "secret" }] })).toBe(true);
    expect(containsPrivateFields({ checkins: [] })).toBe(true);
    expect(cloudSim({ sim, journal: [] })).toBeNull();
    const saved = cloudSim(sim);
    expect(saved?.money).toBe(200);
    expect(JSON.stringify(saved)).not.toMatch(/journal|checkins/);
  });

  it("treats a missing database as single-player", () => {
    expect(databaseConfigured({})).toBe(false);
    expect(databaseConfigured({ DATABASE_URL: "postgres://example" })).toBe(true);
    expect(databaseConfigured({ DATABASE_URL: "not-a-url" })).toBe(false);
  });

  it("clears the town key along with everything else", () => {
    const kv = new Mem();
    kv.setItem(CLOUD_KEY, "token");
    clearAllData(kv);
    expect(kv.getItem(CLOUD_KEY)).toBeNull();
  });

  it("has no pressure language in the shared notes or the shop", () => {
    const text = JSON.stringify([KIND_PRESETS, EMOTES, ITEMS, HOME_ACTIONS, JOBS, FRIENDS]).toLowerCase();
    for (const bad of ["limited time", "hurry", "last chance", "loot", "streak", "leaderboard"]) expect(text, bad).not.toContain(bad);
  });
});
