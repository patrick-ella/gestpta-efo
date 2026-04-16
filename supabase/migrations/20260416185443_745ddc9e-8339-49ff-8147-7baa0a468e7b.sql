DO $$
DECLARE
  ext_id UUID;
BEGIN
  FOR ext_id IN SELECT id FROM public.extrants
  LOOP
    PERFORM public.recalculate_extrant_statut(ext_id);
  END LOOP;
END;
$$;