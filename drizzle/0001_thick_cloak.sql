CREATE TABLE "albums" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"artist_name" text,
	"image_url" text,
	"total_tracks" integer,
	"release_date" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "album_id" text;--> statement-breakpoint
CREATE INDEX "tracks_album_idx" ON "tracks" USING btree ("album_id");