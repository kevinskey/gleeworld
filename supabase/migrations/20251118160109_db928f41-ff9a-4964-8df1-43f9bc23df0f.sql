-- Phase 1: MUS240 Assignment ID Resolver Function

CREATE OR REPLACE FUNCTION resolve_assignment_id(identifier TEXT)
RETURNS UUID AS $$
DECLARE
  assignment_uuid UUID;
BEGIN
  IF identifier ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT id INTO assignment_uuid FROM mus240_assignments WHERE id = identifier::UUID;
    IF FOUND THEN RETURN assignment_uuid; END IF;
  END IF;
  
  SELECT id INTO assignment_uuid FROM gw_assignments WHERE legacy_id = identifier;
  RETURN assignment_uuid;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION resolve_assignment_id IS 'Resolves assignment identifiers across mus240_assignments and gw_assignments';