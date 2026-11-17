CREATE TABLE "artists" (
	"name" text PRIMARY KEY NOT NULL,
	"spotify_id" text,
	"image_url" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth" (
	"id" text PRIMARY KEY DEFAULT 'owner' NOT NULL,
	"spotify_user_id" text NOT NULL,
	"refresh_token" text NOT NULL,
	"access_token" text,
	"expires_at" timestamp with time zone,
	"scope" text,
	"last_sync_at" timestamp with time zone,
	"broken" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plays" (
	"id" text PRIMARY KEY NOT NULL,
	"played_at" timestamp with time zone NOT NULL,
	"ms_played" integer NOT NULL,
	"kind" text NOT NULL,
	"uri" text,
	"track_name" text,
	"artist_name" text,
	"album_name" text,
	"reason_start" text,
	"reason_end" text,
	"skipped" boolean,
	"shuffle" boolean,
	"source" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"rows_seen" integer DEFAULT 0 NOT NULL,
	"rows_written" integer DEFAULT 0 NOT NULL,
	"ok" boolean DEFAULT false NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"uri" text PRIMARY KEY NOT NULL,
	"name" text,
	"artist_name" text,
	"album_name" text,
	"image_url" text,
	"duration_ms" integer,
	"artist_id" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "plays_at_uri_idx" ON "plays" USING btree ("played_at","uri");--> statement-breakpoint
CREATE INDEX "plays_at_idx" ON "plays" USING btree ("played_at");--> statement-breakpoint
CREATE INDEX "plays_artist_idx" ON "plays" USING btree ("artist_name");--> statement-breakpoint
CREATE INDEX "plays_uri_idx" ON "plays" USING btree ("uri");