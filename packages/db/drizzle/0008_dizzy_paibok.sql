ALTER TABLE "elevator_budgets" DROP CONSTRAINT "elevator_budgets_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "elevators" DROP CONSTRAINT "elevators_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "elevators" DROP CONSTRAINT "elevators_last_updated_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "elevator_budgets" ADD CONSTRAINT "elevator_budgets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elevators" ADD CONSTRAINT "elevators_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elevators" ADD CONSTRAINT "elevators_last_updated_by_users_id_fk" FOREIGN KEY ("last_updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;