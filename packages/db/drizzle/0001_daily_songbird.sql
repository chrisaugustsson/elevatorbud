ALTER TABLE "elevator_budgets" ALTER COLUMN "budget_amount" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "elevator_details" ALTER COLUMN "emergency_phone_price" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "contact_submissions" ADD CONSTRAINT "contact_submissions_status_check" CHECK ("contact_submissions"."status" IN ('new', 'read', 'archived'));--> statement-breakpoint
ALTER TABLE "elevators" ADD CONSTRAINT "elevators_status_check" CHECK ("elevators"."status" IN ('active', 'demolished', 'archived'));--> statement-breakpoint
ALTER TABLE "elevators" ADD CONSTRAINT "elevators_build_year_check" CHECK ("elevators"."build_year" IS NULL OR ("elevators"."build_year" >= 1800 AND "elevators"."build_year" <= 2100));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("users"."role" IN ('admin', 'customer'));