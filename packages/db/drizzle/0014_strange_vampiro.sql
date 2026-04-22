CREATE TABLE "custom_field_defs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "custom_field_defs_key_unique" UNIQUE("key"),
	CONSTRAINT "custom_field_defs_type_check" CHECK ("custom_field_defs"."type" IN ('text','number','boolean','date'))
);
--> statement-breakpoint
ALTER TABLE "elevators" ADD COLUMN "property_designation" text;--> statement-breakpoint
ALTER TABLE "elevators" ADD COLUMN "custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "custom_field_defs_key_idx" ON "custom_field_defs" USING btree ("key");--> statement-breakpoint
CREATE INDEX "elevators_custom_fields_gin_idx" ON "elevators" USING gin ("custom_fields");