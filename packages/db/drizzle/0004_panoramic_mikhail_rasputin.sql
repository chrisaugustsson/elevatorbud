ALTER TABLE "elevators" ADD COLUMN "contact_person_name" text;--> statement-breakpoint
ALTER TABLE "elevators" ADD COLUMN "contact_person_phone" text;--> statement-breakpoint
ALTER TABLE "elevators" ADD COLUMN "contact_person_email" text;--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "contact_person";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "phone_number";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "email";