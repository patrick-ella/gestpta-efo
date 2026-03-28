
-- Add tracking columns
ALTER TABLE activites
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by UUID;

ALTER TABLE taches
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by UUID;

ALTER TABLE sous_taches
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Auto-set updated_at and updated_by trigger
CREATE OR REPLACE FUNCTION public.set_updated_meta()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_activites_updated
  BEFORE UPDATE ON activites
  FOR EACH ROW EXECUTE FUNCTION set_updated_meta();

CREATE TRIGGER trg_taches_updated
  BEFORE UPDATE ON taches
  FOR EACH ROW EXECUTE FUNCTION set_updated_meta();

CREATE TRIGGER trg_sous_taches_updated
  BEFORE UPDATE ON sous_taches
  FOR EACH ROW EXECUTE FUNCTION set_updated_meta();
