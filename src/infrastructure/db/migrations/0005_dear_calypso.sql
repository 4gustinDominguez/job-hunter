CREATE TABLE "ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"fetched" integer DEFAULT 0 NOT NULL,
	"created" integer DEFAULT 0 NOT NULL,
	"attached" integer DEFAULT 0 NOT NULL,
	"skipped" integer DEFAULT 0 NOT NULL,
	"prefilter_queued" integer DEFAULT 0 NOT NULL,
	"prefilter_skipped" integer DEFAULT 0 NOT NULL,
	"analyzed" integer DEFAULT 0 NOT NULL,
	"strong" integer DEFAULT 0 NOT NULL,
	"potential" integer DEFAULT 0 NOT NULL,
	"weak" integer DEFAULT 0 NOT NULL,
	"none" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL
);
