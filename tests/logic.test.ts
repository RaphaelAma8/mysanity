import { describe, expect, it } from "vitest";
import { REGIONS, regionById } from "../src/data/regions";
import { EMERGENCY, RESOURCES } from "../src/data/resources";
import { TINY_STEPS } from "../src/data/content";
import { detectCrisis } from "../src/lib/crisis";
import { STORAGE_KEY, addCheckin, addJournal, clearAllData, deleteJournal, emptyState, exportJson, loadState, saveState, type KV } from "../src/lib/state";
import { supportLevel } from "../src/lib/support";

const day = (d: number, h = 12) => new Date(2026, 9, d, h, 0, 0);
class Mem implements KV {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}

describe("crisis language detection", () => {
  it.each([
    "I want to die", "i dont want to be here anymore", "thinking about suicide", "I'm going to kill myself",
    "I wish I was dead", "everyone would be better off without me", "I can’t go on", "I can't go on like this", "i cant go on this way", "I've been hurting myself",
    "there's no reason to live", "I want to end my life", "self harm", "i want to end it all", "I DON'T WANT TO LIVE",
  ])("notices: %s", (t) => expect(detectCrisis(t)).toBe(true));
  it.each([
    "I'm killing it at work", "This deadline is killing me, lol", "I had a good walk and a good coffee",
    "my sister's wedding was lovely", "I want to dye my hair", "I can't go on that trip", "The movie was to die for",
    "",
  ])("does not trigger on: %s", (t) => expect(detectCrisis(t)).toBe(false));
});

describe("check-ins, journal and support", () => {
  it("offers no support after a good day, soft support after a low day, strong after three low days", () => {
    let s = emptyState();
    s = addCheckin(s, 4, [], day(5));
    expect(supportLevel(s.checkins, day(5))).toBe("none");
    s = addCheckin(s, 2, [], day(6));
    expect(supportLevel(s.checkins, day(6))).toBe("soft");
    s = addCheckin(s, 1, [], day(7));
    s = addCheckin(s, 2, [], day(8));
    expect(supportLevel(s.checkins, day(8))).toBe("strong");
    s = addCheckin(s, 4, [], day(9));
    expect(supportLevel(s.checkins, day(9))).toBe("none"); // recovery clears it
  });
  it("uses only the latest check-in of each day", () => {
    let s = emptyState();
    s = addCheckin(s, 1, [], day(5, 8));
    s = addCheckin(s, 4, [], day(5, 20));
    expect(supportLevel(s.checkins, day(5, 21))).toBe("none");
  });
  it("saves, lists and deletes journal entries, ignoring empty ones", () => {
    let s = emptyState();
    s = addJournal(s, "   ", null, day(1));
    expect(s.journal).toHaveLength(0);
    s = addJournal(s, "A hard day, a good tea.", "prompt", day(1));
    s = addJournal(s, "Second", null, day(2));
    expect(s.journal).toHaveLength(2);
    expect(s.journal[0].text).toBe("Second");
    s = deleteJournal(s, s.journal[0].id);
    expect(s.journal.map((e) => e.text)).toEqual(["A hard day, a good tea."]);
  });
});

describe("storage (on-device only)", () => {
  it("round-trips state", () => {
    const kv = new Mem();
    let s = emptyState();
    s = addJournal({ ...s, region: "ns", nickname: "Sam" }, "hello", null, day(1));
    expect(saveState(kv, s)).toBe(true);
    expect(loadState(kv)).toEqual(s);
  });
  it("survives corrupt or hostile saved data", () => {
    const kv = new Mem();
    for (const bad of ["not json", "[]", "null", '{"v":3}', '{"v":1,"tickets":"lots","journal":"x","checkins":[{"mood":9}],"settings":5}']) {
      kv.setItem(STORAGE_KEY, bad);
      const s = loadState(kv);
      expect(s.v).toBe(2);
      expect(Array.isArray(s.journal)).toBe(true);
      expect(s.sim === null || s.sim.money >= 0).toBe(true);
    }
  });
  it("survives storage being blocked", () => {
    const blocked: KV = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("full"); }, removeItem() { throw new Error("blocked"); } };
    expect(loadState(blocked).v).toBe(2);
    expect(saveState(blocked, emptyState())).toBe(false);
    expect(() => clearAllData(blocked)).not.toThrow();
  });
  it("deletes everything on request and exports what it holds", () => {
    const kv = new Mem();
    const s = addJournal(emptyState(), "private thought", null, day(1));
    saveState(kv, s);
    expect(exportJson(s)).toContain("private thought");
    clearAllData(kv);
    expect(kv.getItem(STORAGE_KEY)).toBeNull();
    expect(loadState(kv).journal).toHaveLength(0);
  });
});

describe("content and resources", () => {
  it("covers all 13 provinces and territories with postcards", () => {
    expect(REGIONS).toHaveLength(13);
    expect(new Set(REGIONS.map((r) => r.id)).size).toBe(13);
    for (const r of REGIONS) {
      expect(r.postcards.length, r.id).toBeGreaterThanOrEqual(2);
      expect(r.practice.length, r.id).toBeGreaterThan(10);
      expect(r.at[0]).toBeGreaterThanOrEqual(0); expect(r.at[0]).toBeLessThanOrEqual(100);
      expect(r.at[1]).toBeGreaterThanOrEqual(0); expect(r.at[1]).toBeLessThanOrEqual(60);
    }
    expect(REGIONS.filter((r) => r.kind === "territory").map((r) => r.id).sort()).toEqual(["nt", "nu", "yt"]);
    expect(regionById("qc")?.name).toBe("Quebec");
    expect(regionById("zz")).toBeNull();
  });
  it("never uses clinical or promise language in postcards or tiny steps", () => {
    const banned = /\b(cure|treat(s|ment)?|diagnos|therapy|heal(s|ed)? you|guarantee|will fix)\b/i;
    for (const r of REGIONS) for (const p of [...r.postcards, r.practice, r.blurb]) expect(p, r.id).not.toMatch(banned);
    for (const t of TINY_STEPS) expect(t.text).not.toMatch(banned);
  });
  it("lists crisis resources with correct, dialable numbers", () => {
    const ids = RESOURCES.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(["988", "khp", "hope", "211"]));
    expect(EMERGENCY.call?.tel).toBe("911");
    const r988 = RESOURCES.find((r) => r.id === "988")!;
    expect(r988.call?.tel).toBe("988");
    expect(r988.text?.sms).toBe("988");
    expect(r988.note).toContain("1-833-456-4566");
    expect(RESOURCES.find((r) => r.id === "khp")?.text).toMatchObject({ sms: "686868", body: "CONNECT" });
    expect(RESOURCES.find((r) => r.id === "khp")?.call?.tel).toBe("18006686868");
    expect(RESOURCES.find((r) => r.id === "hope")?.call?.tel).toBe("18552423310");
    for (const r of RESOURCES) {
      expect(r.call || r.web, r.id).toBeTruthy();
      if (r.call) expect(r.call.tel).toMatch(/^\d{3,11}$/);
    }
  });
  it("is honest about what isn't independently verified", () => {
    expect(RESOURCES.filter((r) => !r.verified).map((r) => r.id)).toEqual(["211"]);
  });
});
