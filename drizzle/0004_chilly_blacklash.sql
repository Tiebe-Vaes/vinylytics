CREATE TABLE "weather_days" (
	"day" text PRIMARY KEY NOT NULL,
	"code" integer,
	"precip_mm" real,
	"temp_max_c" real
);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "weather_city" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "weather_lat" real;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "weather_lon" real;