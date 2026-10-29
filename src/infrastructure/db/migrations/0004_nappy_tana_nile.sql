CREATE TABLE "ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trigger" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone NOT NULL,
	"duration_ms" integer NOT NULL,
	"fetched" integer NOT NULL,
	"created" integer NOT NULL,
	"attached" integer NOT NULL,
	"skipped" integer NOT NULL,
	"prefilter_pending" integer NOT NULL,
	"prefilter_skipped" integer NOT NULL,
	"analysis_analyzed" integer,
	"analysis_failed" integer,
	"errors" text[] NOT NULL
);
