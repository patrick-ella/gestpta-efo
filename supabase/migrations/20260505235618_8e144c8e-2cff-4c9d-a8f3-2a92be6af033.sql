-- Replace the buggy trigger on kpi_seuils to only update updated_at (kpi_seuils has no updated_by column)
DROP TRIGGER IF EXISTS kpi_seuils_set_updated ON public.kpi_seuils;

CREATE OR REPLACE FUNCTION public.set_updated_at_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER kpi_seuils_set_updated
BEFORE UPDATE ON public.kpi_seuils
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_only();

-- Same fix for kpi_badges if same issue
DROP TRIGGER IF EXISTS kpi_badges_set_updated ON public.kpi_badges;
CREATE TRIGGER kpi_badges_set_updated
BEFORE UPDATE ON public.kpi_badges
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_only();