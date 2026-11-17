CREATE TABLE "era_overrides" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"anchor" text,
	"name" text,
	"from_day" text,
	"to_day" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
