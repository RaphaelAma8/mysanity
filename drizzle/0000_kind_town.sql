CREATE TABLE "players" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "token_hash" text NOT NULL,
  "friend_code" text NOT NULL,
  "display_name" text NOT NULL,
  "avatar" jsonb NOT NULL,
  "region" text,
  "sim" jsonb,
  "map_id" text,
  "pos_x" real,
  "pos_y" real,
  "emote" text,
  "presence_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "players_token_hash_unique" UNIQUE("token_hash"),
  CONSTRAINT "players_friend_code_unique" UNIQUE("friend_code")
);
--> statement-breakpoint
CREATE TABLE "friendships" (
  "user_a" uuid NOT NULL,
  "user_b" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "friendships_user_a_user_b_pk" PRIMARY KEY("user_a","user_b"),
  CONSTRAINT "friendships_order" CHECK ("user_a"::text < "user_b"::text)
);
--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_a_players_id_fk" FOREIGN KEY ("user_a") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_b_players_id_fk" FOREIGN KEY ("user_b") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "kind_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "from_id" uuid NOT NULL,
  "to_id" uuid NOT NULL,
  "preset" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kind_notes" ADD CONSTRAINT "kind_notes_from_id_players_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "kind_notes" ADD CONSTRAINT "kind_notes_to_id_players_id_fk" FOREIGN KEY ("to_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "kind_notes_to_idx" ON "kind_notes" USING btree ("to_id","created_at");
