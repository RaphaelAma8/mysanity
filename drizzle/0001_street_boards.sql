CREATE TABLE "advertisements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_name" text NOT NULL,
  "line" text NOT NULL,
  "detail" text NOT NULL DEFAULT '',
  "contact" text NOT NULL DEFAULT '',
  "accent" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "advertisements_status_idx" ON "advertisements" ("status", "created_at");
