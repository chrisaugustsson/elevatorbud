CREATE TABLE "contact_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"message" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "elevator_budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"elevator_id" uuid NOT NULL,
	"revision_year" integer NOT NULL,
	"recommended_modernization_year" text,
	"budget_amount" real,
	"measures" text,
	"warranty" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "elevator_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"elevator_id" uuid NOT NULL,
	"speed" text,
	"lift_height" text,
	"load_capacity" text,
	"floor_count" integer,
	"door_count" integer,
	"door_type" text,
	"passthrough" boolean,
	"dispatch_mode" text,
	"cab_size" text,
	"door_opening" text,
	"door_carrier" text,
	"door_machine" text,
	"drive_system" text,
	"suspension" text,
	"machine_placement" text,
	"machine_type" text,
	"control_system_type" text,
	"shaft_lighting" text,
	"emergency_phone_model" text,
	"emergency_phone_type" text,
	"emergency_phone_price" real,
	"comments" text,
	CONSTRAINT "elevator_details_elevator_id_unique" UNIQUE("elevator_id")
);
--> statement-breakpoint
CREATE TABLE "elevators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"elevator_number" text NOT NULL,
	"address" text,
	"elevator_classification" text,
	"district" text,
	"inventory_date" text,
	"elevator_type" text,
	"manufacturer" text,
	"build_year" integer,
	"inspection_authority" text,
	"inspection_month" text,
	"maintenance_company" text,
	"modernization_year" text,
	"has_emergency_phone" boolean,
	"needs_upgrade" boolean,
	"organization_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_updated_by" uuid,
	"last_updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"organization_number" text,
	"contact_person" text,
	"phone_number" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "suggested_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"value" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suggested_values_category_value_unique" UNIQUE("category","value")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'customer' NOT NULL,
	"organization_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login" timestamp with time zone,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
ALTER TABLE "elevator_budgets" ADD CONSTRAINT "elevator_budgets_elevator_id_elevators_id_fk" FOREIGN KEY ("elevator_id") REFERENCES "public"."elevators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elevator_budgets" ADD CONSTRAINT "elevator_budgets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elevator_details" ADD CONSTRAINT "elevator_details_elevator_id_elevators_id_fk" FOREIGN KEY ("elevator_id") REFERENCES "public"."elevators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elevators" ADD CONSTRAINT "elevators_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elevators" ADD CONSTRAINT "elevators_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elevators" ADD CONSTRAINT "elevators_last_updated_by_users_id_fk" FOREIGN KEY ("last_updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_submissions_status_idx" ON "contact_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "elevator_budgets_elevator_id_idx" ON "elevator_budgets" USING btree ("elevator_id");--> statement-breakpoint
CREATE INDEX "elevator_budgets_elevator_id_revision_year_idx" ON "elevator_budgets" USING btree ("elevator_id","revision_year");--> statement-breakpoint
CREATE INDEX "elevator_details_elevator_id_idx" ON "elevator_details" USING btree ("elevator_id");--> statement-breakpoint
CREATE INDEX "elevators_organization_id_idx" ON "elevators" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "elevators_elevator_number_idx" ON "elevators" USING btree ("elevator_number");--> statement-breakpoint
CREATE INDEX "elevators_organization_id_status_idx" ON "elevators" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "elevators_district_idx" ON "elevators" USING btree ("district");--> statement-breakpoint
CREATE INDEX "elevators_manufacturer_idx" ON "elevators" USING btree ("manufacturer");--> statement-breakpoint
CREATE INDEX "elevators_elevator_type_idx" ON "elevators" USING btree ("elevator_type");--> statement-breakpoint
CREATE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "suggested_values_category_idx" ON "suggested_values" USING btree ("category");--> statement-breakpoint
CREATE INDEX "users_organization_id_idx" ON "users" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");