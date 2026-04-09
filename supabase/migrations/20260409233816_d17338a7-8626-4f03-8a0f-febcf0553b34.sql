
-- Drop the old unique constraint that blocks renumbering
ALTER TABLE public.extrants DROP CONSTRAINT IF EXISTS extrants_activite_id_reference_key;

-- Add global unique constraint on reference alone
ALTER TABLE public.extrants ADD CONSTRAINT extrants_reference_key UNIQUE (reference);

-- Update function: two-pass to avoid unique constraint violations
CREATE OR REPLACE FUNCTION public.renumber_extrants()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec RECORD;
  counter INTEGER := 1;
BEGIN
  -- Pass 1: set all references to temporary unique values to avoid conflicts
  UPDATE public.extrants SET reference = '__TMP__' || id::text;

  -- Pass 2: assign final E1..En in correct order
  FOR rec IN
    SELECT e.id
    FROM public.extrants e
    JOIN public.activites a ON a.id = e.activite_id
    ORDER BY a.code ASC, e.ordre ASC, e.created_at ASC
  LOOP
    UPDATE public.extrants
    SET reference = 'E' || counter
    WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END;
$$;

-- Run initial renumbering now
SELECT public.renumber_extrants();
