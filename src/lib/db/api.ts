import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { and, asc, desc, eq, gt, inArray, ne, or, sql } from "drizzle-orm";
import { getDb } from "./client";
import { advertisements, friendships, kindNotes, players } from "./schema";
import { moderateAd, type ApprovedAd } from "@/lib/ads/moderate";
import { cloudSim, moderatePublicName } from "@/lib/social/guard";
import { emoteById, presetById } from "@/lib/social/presets";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function authed(req: Request) {
  const db = getDb();
  if (!db) return { db: null, player: null, error: json({ ok: false, error: "database_off" }, 503) };
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (token.length < 20) return { db, player: null, error: json({ ok: false, error: "Sign in to the town first." }, 401) };
  const rows = await db.select().from(players).where(eq(players.tokenHash, hashToken(token))).limit(1);
  const player = rows[0];
  if (!player) return { db, player: null, error: json({ ok: false, error: "That town key is not recognised." }, 401) };
  return { db, player, error: null };
}

function friendCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export function publicPlayer(p: { id: string; displayName: string; friendCode: string; avatar: unknown; region: string | null }) {
  return { id: p.id, displayName: p.displayName, friendCode: p.friendCode, avatar: p.avatar, region: p.region };
}

export async function createPlayer(body: { displayName?: string; avatar?: unknown; region?: string }) {
  const db = getDb();
  if (!db) return json({ ok: false, error: "database_off" }, 503);
  const name = moderatePublicName(String(body.displayName ?? ""));
  if (!name.ok) return json({ ok: false, crisis: name.crisis, error: name.reason }, name.crisis ? 422 : 400);
  const avatar = body.avatar && typeof body.avatar === "object" ? body.avatar : { skin: 1, hair: 1, style: 0, shirt: 1 };
  const token = randomBytes(32).toString("hex");
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [row] = await db.insert(players).values({
        tokenHash: hashToken(token),
        friendCode: friendCode(),
        displayName: name.name,
        avatar,
        region: typeof body.region === "string" ? body.region.slice(0, 8) : null,
      }).returning();
      return json({ ok: true, token, player: publicPlayer(row) });
    } catch {
      /* friend code collision, try again */
    }
  }
  return json({ ok: false, error: "Could not create a town key. Try again in a moment." }, 500);
}

export async function saveSim(playerId: string, raw: unknown, region: unknown) {
  const db = getDb();
  if (!db) return json({ ok: false, error: "database_off" }, 503);
  if (raw && typeof raw === "object" && ("journal" in raw || "checkins" in raw)) {
    return json({ ok: false, error: "Journal and check-ins stay on this device." }, 400);
  }
  const sim = cloudSim(raw);
  if (!sim) return json({ ok: false, error: "That save could not be read." }, 400);
  const [row] = await db.update(players).set({
    sim,
    region: typeof region === "string" ? region.slice(0, 8) : undefined,
    updatedAt: new Date(),
  }).where(eq(players.id, playerId)).returning({ updatedAt: players.updatedAt });
  return json({ ok: true, updatedAt: row?.updatedAt });
}

export async function readSave(playerId: string) {
  const db = getDb();
  if (!db) return json({ ok: false, error: "database_off" }, 503);
  const [row] = await db.select({ sim: players.sim, updatedAt: players.updatedAt, region: players.region }).from(players).where(eq(players.id, playerId)).limit(1);
  return json({ ok: true, sim: row?.sim ?? null, updatedAt: row?.updatedAt ?? null, region: row?.region ?? null });
}

export async function touchPresence(playerId: string, body: { map?: string; x?: number; y?: number; emote?: string | null }) {
  const db = getDb();
  if (!db) return json({ ok: false, error: "database_off" }, 503);
  const map = String(body.map ?? "").slice(0, 24);
  if (map === "home" || !map) return json({ ok: false, error: "Home stays private." }, 400);
  const x = Number(body.x);
  const y = Number(body.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return json({ ok: false, error: "Missing place." }, 400);
  const emote = body.emote ? emoteById(String(body.emote)) : null;
  await db.update(players).set({
    mapId: map,
    posX: Math.max(0, Math.min(80, x)),
    posY: Math.max(0, Math.min(80, y)),
    emote: emote?.emoji ?? null,
    presenceAt: new Date(),
  }).where(eq(players.id, playerId));
  return json({ ok: true });
}

export async function nearby(playerId: string, map: string) {
  const db = getDb();
  if (!db) return json({ ok: false, error: "database_off" }, 503);
  if (map === "home") return json({ ok: true, people: [] });
  const since = new Date(Date.now() - 20_000);
  const rows = await db.select({
    id: players.id,
    displayName: players.displayName,
    avatar: players.avatar,
    posX: players.posX,
    posY: players.posY,
    emote: players.emote,
  }).from(players).where(and(
    eq(players.mapId, map),
    gt(players.presenceAt, since),
    ne(players.id, playerId),
  )).limit(40);
  return json({
    ok: true,
    people: rows.filter((r) => r.posX != null && r.posY != null).map((r) => ({
      id: r.id, name: r.displayName, avatar: r.avatar, x: r.posX, y: r.posY, emote: r.emote,
    })),
  });
}

function orderedPair(a: string, b: string): [string, string] | null {
  if (a === b) return null;
  return a < b ? [a, b] : [b, a];
}

export async function addFriend(playerId: string, code: string) {
  const db = getDb();
  if (!db) return json({ ok: false, error: "database_off" }, 503);
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  if (clean.length < 6) return json({ ok: false, error: "Enter the 8-letter friend code." }, 400);
  const [other] = await db.select().from(players).where(sql`upper(${players.friendCode}) = ${clean}`).limit(1);
  if (!other) return json({ ok: false, error: "No one has that code yet." }, 404);
  const pair = orderedPair(playerId, other.id);
  if (!pair) return json({ ok: false, error: "That is your own code." }, 400);
  await db.insert(friendships).values({ userA: pair[0], userB: pair[1] }).onConflictDoNothing();
  return json({ ok: true, friend: { id: other.id, displayName: other.displayName } });
}

export async function listFriends(playerId: string) {
  const db = getDb();
  if (!db) return json({ ok: false, error: "database_off" }, 503);
  const links = await db.select().from(friendships).where(or(eq(friendships.userA, playerId), eq(friendships.userB, playerId)));
  const ids = links.map((l) => (l.userA === playerId ? l.userB : l.userA));
  if (ids.length === 0) return json({ ok: true, friends: [] });
  const rows = await db.select({
    id: players.id, displayName: players.displayName, mapId: players.mapId, presenceAt: players.presenceAt,
  }).from(players).where(inArray(players.id, ids));
  const fresh = Date.now() - 20_000;
  return json({
    ok: true,
    friends: rows.map((r) => ({
      id: r.id,
      displayName: r.displayName,
      around: r.mapId !== "home" && r.presenceAt != null && r.presenceAt.getTime() > fresh,
    })),
  });
}

export async function sendNote(fromId: string, toId: string, presetId: string) {
  const db = getDb();
  if (!db) return json({ ok: false, error: "database_off" }, 503);
  const preset = presetById(presetId);
  if (!preset) return json({ ok: false, error: "Pick one of the kind notes." }, 400);
  const pair = orderedPair(fromId, toId);
  if (!pair) return json({ ok: false, error: "Choose a friend." }, 400);
  const [link] = await db.select().from(friendships).where(and(eq(friendships.userA, pair[0]), eq(friendships.userB, pair[1]))).limit(1);
  if (!link) return json({ ok: false, error: "You can send a note once you are friends." }, 403);
  const since = new Date(Date.now() - 60_000);
  const recent = await db.select({ id: kindNotes.id }).from(kindNotes).where(and(eq(kindNotes.fromId, fromId), gt(kindNotes.createdAt, since)));
  if (recent.length >= 12) return json({ ok: false, error: "That's plenty of notes for a minute. They will keep." }, 429);
  await db.insert(kindNotes).values({ fromId, toId, preset: preset.id });
  return json({ ok: true });
}

export async function listNotes(playerId: string) {
  const db = getDb();
  if (!db) return json({ ok: false, error: "database_off" }, 503);
  const rows = await db.select({
    id: kindNotes.id,
    preset: kindNotes.preset,
    createdAt: kindNotes.createdAt,
    fromName: players.displayName,
  }).from(kindNotes)
    .innerJoin(players, eq(players.id, kindNotes.fromId))
    .where(eq(kindNotes.toId, playerId))
    .orderBy(desc(kindNotes.createdAt))
    .limit(30);
  return json({
    ok: true,
    notes: rows.map((r) => {
      const preset = presetById(r.preset);
      return { id: r.id, fromName: r.fromName, emoji: preset?.emoji ?? "💛", text: preset?.text ?? "sends a kind note", at: r.createdAt };
    }),
  });
}

export async function countAround() {
  const db = getDb();
  if (!db) return 0;
  const since = new Date(Date.now() - 20_000);
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(players).where(and(
    gt(players.presenceAt, since),
    sql`${players.mapId} is not null and ${players.mapId} <> 'home'`,
  ));
  return Number(row?.n ?? 0);
}

function toPublicAd(row: { id: string; businessName: string; line: string; accent: string; contact: string }): ApprovedAd {
  return { id: row.id, businessName: row.businessName, line: row.line, accent: row.accent, contact: row.contact };
}

/** Approved boards only. The query has no viewer, mood, or journal column. */
export async function listApprovedAds() {
  const db = getDb();
  if (!db) return json({ ok: true, database: false, ads: [] as ApprovedAd[] });
  const rows = await db.select({
    id: advertisements.id,
    businessName: advertisements.businessName,
    line: advertisements.line,
    accent: advertisements.accent,
    contact: advertisements.contact,
  }).from(advertisements).where(eq(advertisements.status, "approved")).orderBy(asc(advertisements.id)).limit(40);
  return json({ ok: true, database: true, ads: rows.map(toPublicAd) });
}

export async function submitAd(body: unknown) {
  const db = getDb();
  if (!db) return json({ ok: false, error: "database_off" }, 503);
  const verdict = moderateAd(body);
  if (!verdict.ok) return json({ ok: false, crisis: verdict.crisis, error: verdict.reason }, verdict.crisis ? 422 : 400);
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db.select({ id: advertisements.id }).from(advertisements).where(gt(advertisements.createdAt, since));
  if (recent.length >= 30) return json({ ok: false, error: "The board queue is full for this hour. Try again later." }, 429);
  const [row] = await db.insert(advertisements).values({
    businessName: verdict.ad.businessName,
    line: verdict.ad.line,
    detail: verdict.ad.detail,
    contact: verdict.ad.contact,
    accent: verdict.ad.accent,
    status: "pending",
  }).returning({ id: advertisements.id });
  return json({ ok: true, id: row?.id, status: "pending" });
}

export function adminAuthorized(req: Request) {
  const expected = process.env.ADMIN_TOKEN ?? "";
  if (expected.length < 16) return json({ ok: false, error: "ADMIN_TOKEN is not set on the server." }, 503);
  const header = req.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return json({ ok: false, error: "That review key was not accepted." }, 401);
  return null;
}

export async function listPendingAds() {
  const db = getDb();
  if (!db) return json({ ok: false, error: "database_off" }, 503);
  const rows = await db.select().from(advertisements).where(eq(advertisements.status, "pending")).orderBy(desc(advertisements.createdAt)).limit(50);
  return json({
    ok: true,
    ads: rows.map((r) => ({
      id: r.id, businessName: r.businessName, line: r.line, detail: r.detail, contact: r.contact, accent: r.accent, createdAt: r.createdAt,
    })),
  });
}

export async function reviewAd(id: string, status: string) {
  const db = getDb();
  if (!db) return json({ ok: false, error: "database_off" }, 503);
  if (status !== "approved" && status !== "rejected") return json({ ok: false, error: "Choose approved or rejected." }, 400);
  const [row] = await db.update(advertisements).set({ status, reviewedAt: new Date() }).where(eq(advertisements.id, id)).returning({ id: advertisements.id, status: advertisements.status });
  if (!row) return json({ ok: false, error: "That board was not found." }, 404);
  return json({ ok: true, id: row.id, status: row.status });
}

export async function deletePlayer(playerId: string) {
  const db = getDb();
  if (!db) return json({ ok: false, error: "database_off" }, 503);
  await db.delete(players).where(eq(players.id, playerId));
  return json({ ok: true });
}
