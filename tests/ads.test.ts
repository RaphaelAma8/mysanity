import { describe, expect, it } from "vitest";
import { assignBoards, moderateAd } from "../src/lib/ads/moderate";
import { newSim, placeOuting } from "../src/lib/sim/engine";
import { DEFAULT_AVATAR } from "../src/lib/state";

describe("business boards", () => {
  it("accepts a plain submission and refuses crisis, pressure, and private fields", () => {
    const ok = moderateAd({ businessName: "Lake Bakery", line: "Bread most mornings", contact: "https://example.com/bakery" });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.ad.accent.startsWith("#")).toBe(true);

    const crisis = moderateAd({ businessName: "Shop", line: "I want to die" });
    expect(crisis.ok).toBe(false);
    if (!crisis.ok) {
      expect(crisis.crisis).toBe(true);
      expect(crisis.reason).toMatch(/9-8-8/);
    }

    const pressure = moderateAd({ businessName: "Shop", line: "Hurry, limited time only today" });
    expect(pressure.ok).toBe(false);

    const priv = moderateAd({ businessName: "Shop", line: "Hello", journal: "secret" });
    expect(priv.ok).toBe(false);
    const mood = moderateAd({ businessName: "Shop", line: "Hello", mood: "low" });
    expect(mood.ok).toBe(false);
  });

  it("paints the same boards for everyone, with no viewer attached", () => {
    const slots = [{ id: "a", x: 1, y: 2 }, { id: "b", x: 3, y: 4 }, { id: "c", x: 5, y: 6 }];
    const ads = [
      { id: "z", businessName: "Zed", line: "One", accent: "#1f6b4a", contact: "" },
      { id: "a", businessName: "Aye", line: "Two", accent: "#8c3b32", contact: "" },
    ];
    const first = assignBoards(slots, ads);
    const second = assignBoards(slots, [...ads].reverse());
    expect(first.map((b) => b.ad?.businessName)).toEqual(["Aye", "Zed", "Aye"]);
    expect(second).toEqual(first);
    expect(assignBoards(slots, [])).toEqual(slots.map((s) => ({ ...s, ad: null })));
  });

  it("lets people share the club, gym and farm without taking money", () => {
    let sim = newSim(DEFAULT_AVATAR, new Date());
    sim = { ...sim, visitedToday: ["club", "gym", "farm"] };
    const before = sim.money;
    for (const id of ["club", "gym", "farm"] as const) {
      const result = placeOuting(sim, id);
      expect(result.ok).toBe(true);
      expect(result.sim.money).toBe(before);
      expect(result.message.toLowerCase()).not.toMatch(/hurry|debt|streak/);
    }
  });
});
