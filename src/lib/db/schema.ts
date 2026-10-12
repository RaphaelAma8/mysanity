import { index, jsonb, pgTable, primaryKey, real, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Optional accounts. The journal and check-ins are never columns here. */
export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull().unique(),
  friendCode: text("friend_code").notNull().unique(),
  displayName: text("display_name").notNull(),
  avatar: jsonb("avatar").notNull(),
  region: text("region"),
  sim: jsonb("sim"),
  mapId: text("map_id"),
  posX: real("pos_x"),
  posY: real("pos_y"),
  emote: text("emote"),
  presenceAt: timestamp("presence_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const friendships = pgTable("friendships", {
  userA: uuid("user_a").notNull().references(() => players.id, { onDelete: "cascade" }),
  userB: uuid("user_b").notNull().references(() => players.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  primaryKey({ columns: [t.userA, t.userB] }),
]);

/** Local business boards. No viewer id, no mood, no journal. */
export const advertisements = pgTable("advertisements", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessName: text("business_name").notNull(),
  line: text("line").notNull(),
  detail: text("detail").notNull().default(""),
  contact: text("contact").notNull().default(""),
  accent: text("accent").notNull(),
  kind: text("kind").notNull().default("board"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
}, (t) => [
  index("advertisements_status_idx").on(t.status, t.createdAt),
]);

export const kindNotes = pgTable("kind_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromId: uuid("from_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  toId: uuid("to_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  preset: text("preset").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("kind_notes_to_idx").on(t.toId, t.createdAt),
]);
