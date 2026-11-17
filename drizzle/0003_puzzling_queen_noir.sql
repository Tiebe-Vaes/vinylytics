CREATE TABLE "settings" (
	"id" text PRIMARY KEY DEFAULT 'owner' NOT NULL,
	"public_enabled" boolean DEFAULT false NOT NULL,
	"public_sections" jsonb DEFAULT '{"eras":true,"top":true,"insights":false,"nowPlaying":false}'::jsonb NOT NULL
);
