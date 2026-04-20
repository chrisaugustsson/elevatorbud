DROP INDEX "elevator_budgets_elevator_id_revision_year_idx";--> statement-breakpoint
ALTER TABLE "elevator_budgets" DROP COLUMN "revision_year";--> statement-breakpoint
ALTER TABLE "elevators" ADD CONSTRAINT "elevators_organization_id_elevator_number_unique" UNIQUE("organization_id","elevator_number");