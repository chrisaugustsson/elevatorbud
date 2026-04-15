-- Close the READ COMMITTED race in enforce_one_level_org_hierarchy:
-- two concurrent writes could each pass the "parent is root" and "has no
-- children" checks at their own snapshot, then both commit and produce a
-- 2-level chain. We serialize all hierarchy writes via a single advisory
-- transaction lock. This is a low-traffic admin operation, so coarse
-- serialization is the simplest reliable fix.
CREATE OR REPLACE FUNCTION enforce_one_level_org_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(8137268301473626000);

  IF NEW.parent_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM organizations WHERE id = NEW.parent_id AND parent_id IS NOT NULL) THEN
      RAISE EXCEPTION 'Cannot set parent: target parent already has a parent (only one level of nesting allowed)';
    END IF;
    IF EXISTS (SELECT 1 FROM organizations WHERE parent_id = NEW.id) THEN
      RAISE EXCEPTION 'Cannot set parent: this organization already has children (only one level of nesting allowed)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
