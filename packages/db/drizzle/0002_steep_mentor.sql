ALTER TABLE "organizations" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_parent_id_organizations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE OR REPLACE FUNCTION enforce_one_level_org_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  -- When setting a parent, ensure the parent is a root org (has no parent itself)
  IF NEW.parent_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM organizations WHERE id = NEW.parent_id AND parent_id IS NOT NULL) THEN
      RAISE EXCEPTION 'Cannot set parent: target parent already has a parent (only one level of nesting allowed)';
    END IF;
  END IF;

  -- When clearing parent (becoming root) or on insert as root, ensure this org has no children
  -- (not needed here — a root can have children; only a child can't have children)

  -- Ensure this org doesn't already have children if it's being made a child
  IF NEW.parent_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM organizations WHERE parent_id = NEW.id) THEN
      RAISE EXCEPTION 'Cannot set parent: this organization already has children (only one level of nesting allowed)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER trg_enforce_one_level_org_hierarchy
  BEFORE INSERT OR UPDATE OF parent_id ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION enforce_one_level_org_hierarchy();