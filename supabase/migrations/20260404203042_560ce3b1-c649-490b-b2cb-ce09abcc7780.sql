
-- Table 1: Extrants (outputs) at activité level
CREATE TABLE public.extrants (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activite_id       UUID NOT NULL REFERENCES public.activites(id) ON DELETE CASCADE,
  reference         TEXT NOT NULL,
  libelle           TEXT NOT NULL,
  indicateur_mesure TEXT NOT NULL,
  statut            TEXT NOT NULL DEFAULT 'non_produit',
  statut_mode       TEXT NOT NULL DEFAULT 'auto',
  date_production   DATE,
  date_validation   DATE,
  valide_par        UUID,
  rejete_motif      TEXT,
  ordre             INT DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  updated_by        UUID,
  UNIQUE(activite_id, reference)
);

-- Table 2: Validation criteria for each extrant
CREATE TABLE public.extrants_criteres (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  extrant_id      UUID NOT NULL REFERENCES public.extrants(id) ON DELETE CASCADE,
  libelle         TEXT NOT NULL,
  type_critere    TEXT NOT NULL,
  date_echeance   DATE,
  seuil_valeur    NUMERIC,
  seuil_unite     TEXT,
  valide_manuellement BOOL DEFAULT false,
  valide_auto     BOOL DEFAULT false,
  valide_final    BOOL GENERATED ALWAYS AS (valide_manuellement OR valide_auto) STORED,
  ordre           INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Table 3: Links between criteria and sous-tâches
CREATE TABLE public.criteres_sous_taches (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  critere_id      UUID NOT NULL REFERENCES public.extrants_criteres(id) ON DELETE CASCADE,
  sous_tache_id   UUID NOT NULL REFERENCES public.sous_taches(id) ON DELETE CASCADE,
  condition_type  TEXT NOT NULL,
  condition_seuil NUMERIC,
  UNIQUE(critere_id, sous_tache_id)
);

-- Indexes
CREATE INDEX idx_extrants_activite ON public.extrants(activite_id);
CREATE INDEX idx_extrants_statut ON public.extrants(statut);
CREATE INDEX idx_extrants_criteres_extrant ON public.extrants_criteres(extrant_id);
CREATE INDEX idx_criteres_sous_taches_critere ON public.criteres_sous_taches(critere_id);
CREATE INDEX idx_criteres_sous_taches_st ON public.criteres_sous_taches(sous_tache_id);

-- RLS
ALTER TABLE public.extrants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extrants_criteres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criteres_sous_taches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_extrants" ON public.extrants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "write_extrants" ON public.extrants
  FOR ALL TO authenticated USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_pta'::app_role)
  );

CREATE POLICY "read_criteres" ON public.extrants_criteres
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "write_criteres" ON public.extrants_criteres
  FOR ALL TO authenticated USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_pta'::app_role) OR has_role(auth.uid(), 'responsable_activite'::app_role)
  );

CREATE POLICY "read_liens" ON public.criteres_sous_taches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "write_liens" ON public.criteres_sous_taches
  FOR ALL TO authenticated USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_pta'::app_role)
  );

-- Function: recalculate extrant statut
CREATE OR REPLACE FUNCTION public.recalculate_extrant_statut(p_extrant_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_criteres INT;
  v_criteres_valides INT;
  v_new_statut TEXT;
  v_current_statut TEXT;
BEGIN
  SELECT statut INTO v_current_statut
  FROM public.extrants WHERE id = p_extrant_id;

  IF v_current_statut IN ('valide', 'rejete') THEN
    RETURN;
  END IF;

  -- Auto-validate binaire criteria (avancement_100)
  UPDATE public.extrants_criteres ec
  SET valide_auto = EXISTS (
    SELECT 1 FROM public.criteres_sous_taches cst
    JOIN public.executions e ON e.sous_tache_id = cst.sous_tache_id
    WHERE cst.critere_id = ec.id
      AND cst.condition_type = 'avancement_100'
      AND e.avancement_pct = 100
  )
  WHERE ec.extrant_id = p_extrant_id
    AND ec.type_critere = 'binaire';

  -- Auto-validate avancement_seuil criteria
  UPDATE public.extrants_criteres ec
  SET valide_auto = EXISTS (
    SELECT 1 FROM public.criteres_sous_taches cst
    JOIN public.executions e ON e.sous_tache_id = cst.sous_tache_id
    WHERE cst.critere_id = ec.id
      AND cst.condition_type = 'avancement_seuil'
      AND e.avancement_pct >= cst.condition_seuil
  )
  WHERE ec.extrant_id = p_extrant_id
    AND ec.type_critere = 'quantitatif';

  -- Auto-validate date criteria
  UPDATE public.extrants_criteres ec
  SET valide_auto = EXISTS (
    SELECT 1 FROM public.criteres_sous_taches cst
    JOIN public.executions e ON e.sous_tache_id = cst.sous_tache_id
    WHERE cst.critere_id = ec.id
      AND cst.condition_type = 'date_avant'
      AND e.avancement_pct = 100
      AND e.date_maj::DATE <= ec.date_echeance
  )
  WHERE ec.extrant_id = p_extrant_id
    AND ec.type_critere = 'date';

  -- Count criteria
  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE valide_final = true)
  INTO v_total_criteres, v_criteres_valides
  FROM public.extrants_criteres
  WHERE extrant_id = p_extrant_id;

  -- Determine new statut
  IF v_total_criteres = 0 THEN
    v_new_statut := 'non_produit';
  ELSIF v_criteres_valides = 0 THEN
    v_new_statut := 'non_produit';
  ELSIF v_criteres_valides < v_total_criteres THEN
    v_new_statut := 'en_cours';
  ELSE
    v_new_statut := 'produit';
    UPDATE public.extrants
    SET date_production = CURRENT_DATE
    WHERE id = p_extrant_id
      AND date_production IS NULL;
  END IF;

  UPDATE public.extrants
  SET statut = v_new_statut,
      statut_mode = 'auto',
      updated_at = now()
  WHERE id = p_extrant_id
    AND statut NOT IN ('valide', 'rejete');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: cascade from execution update to extrants
CREATE OR REPLACE FUNCTION public.cascade_extrant_update()
RETURNS TRIGGER AS $$
DECLARE
  v_extrant_id UUID;
BEGIN
  FOR v_extrant_id IN
    SELECT DISTINCT e.id
    FROM public.extrants e
    JOIN public.extrants_criteres ec ON ec.extrant_id = e.id
    JOIN public.criteres_sous_taches cst ON cst.critere_id = ec.id
    WHERE cst.sous_tache_id = COALESCE(NEW.sous_tache_id, OLD.sous_tache_id)
  LOOP
    PERFORM public.recalculate_extrant_statut(v_extrant_id);
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on executions
DROP TRIGGER IF EXISTS trg_cascade_extrant ON public.executions;
CREATE TRIGGER trg_cascade_extrant
AFTER INSERT OR UPDATE OF avancement_pct, date_maj OR DELETE
ON public.executions
FOR EACH ROW
EXECUTE FUNCTION public.cascade_extrant_update();
