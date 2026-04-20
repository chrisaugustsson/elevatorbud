CREATE TABLE "elevator_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"elevator_id" uuid NOT NULL,
	"type" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"cost" numeric(12, 2),
	"currency" text DEFAULT 'SEK',
	"performed_by" text,
	"metadata" jsonb,
	"attachments" jsonb,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone,
	CONSTRAINT "elevator_events_type_check" CHECK ("elevator_events"."type" IN ('inventory','inspection','repair','service','modernization','replacement','note')),
	CONSTRAINT "elevator_events_cost_nonneg" CHECK ("elevator_events"."cost" IS NULL OR "elevator_events"."cost" >= 0)
);
--> statement-breakpoint
ALTER TABLE "elevator_events" ADD CONSTRAINT "elevator_events_elevator_id_elevators_id_fk" FOREIGN KEY ("elevator_id") REFERENCES "public"."elevators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elevator_events" ADD CONSTRAINT "elevator_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elevator_events" ADD CONSTRAINT "elevator_events_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "elevator_events_elevator_id_idx" ON "elevator_events" USING btree ("elevator_id");--> statement-breakpoint
CREATE INDEX "elevator_events_elevator_id_occurred_at_idx" ON "elevator_events" USING btree ("elevator_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "elevator_events_type_idx" ON "elevator_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "elevator_events_occurred_at_idx" ON "elevator_events" USING btree ("occurred_at");