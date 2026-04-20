CREATE INDEX "organizations_parent_id_idx" ON "organizations" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "user_organizations_user_id_idx" ON "user_organizations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_organizations_organization_id_idx" ON "user_organizations" USING btree ("organization_id");