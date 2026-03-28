
-- Code generation functions
CREATE OR REPLACE FUNCTION public.generate_tache_code(p_activite_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_activite_code TEXT;
  v_max_seq INT;
BEGIN
  SELECT code INTO v_activite_code FROM activites WHERE id = p_activite_id;
  SELECT COALESCE(MAX(CAST(RIGHT(code, 3) AS INT)), 0) INTO v_max_seq
  FROM taches WHERE activite_id = p_activite_id AND LENGTH(code) = LENGTH(v_activite_code) + 3;
  RETURN v_activite_code || LPAD((v_max_seq + 1)::TEXT, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_sous_tache_code(p_tache_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tache_code TEXT;
  v_max_seq INT;
BEGIN
  SELECT code INTO v_tache_code FROM taches WHERE id = p_tache_id;
  SELECT COALESCE(MAX(CAST(RIGHT(code, 2) AS INT)), 0) INTO v_max_seq
  FROM sous_taches WHERE tache_id = p_tache_id AND LENGTH(code) = LENGTH(v_tache_code) + 2;
  RETURN v_tache_code || LPAD((v_max_seq + 1)::TEXT, 2, '0');
END;
$$;
