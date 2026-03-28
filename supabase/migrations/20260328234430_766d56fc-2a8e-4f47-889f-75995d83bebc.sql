
-- 1. Nomenclature budgétaire reference table
CREATE TABLE IF NOT EXISTS public.nomenclature_budgetaire (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  libelle TEXT NOT NULL,
  famille TEXT,
  actif BOOLEAN DEFAULT true
);

ALTER TABLE public.nomenclature_budgetaire ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read nomenclature" ON public.nomenclature_budgetaire
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage nomenclature" ON public.nomenclature_budgetaire
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_pta'::app_role));

-- 2. Sous-tâche budget lines table
CREATE TABLE IF NOT EXISTS public.sous_tache_lignes_budgetaires (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sous_tache_id UUID NOT NULL REFERENCES public.sous_taches(id) ON DELETE CASCADE,
  exercice_id UUID NOT NULL REFERENCES public.exercices(id) ON DELETE CASCADE,
  nomenclature_id UUID NOT NULL REFERENCES public.nomenclature_budgetaire(id),
  code_ligne TEXT NOT NULL,
  libelle_ligne TEXT NOT NULL,
  montant_prevu BIGINT NOT NULL DEFAULT 0,
  montant_execute BIGINT NOT NULL DEFAULT 0,
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID,
  CONSTRAINT unique_ligne_par_st UNIQUE (sous_tache_id, exercice_id, nomenclature_id)
);

CREATE INDEX idx_stlb_sous_tache ON public.sous_tache_lignes_budgetaires(sous_tache_id);
CREATE INDEX idx_stlb_exercice ON public.sous_tache_lignes_budgetaires(exercice_id);
CREATE INDEX idx_stlb_nomenclature ON public.sous_tache_lignes_budgetaires(nomenclature_id);

ALTER TABLE public.sous_tache_lignes_budgetaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_lignes" ON public.sous_tache_lignes_budgetaires
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "write_lignes" ON public.sous_tache_lignes_budgetaires
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin_pta'::app_role) OR
    has_role(auth.uid(), 'responsable_activite'::app_role) OR
    has_role(auth.uid(), 'agent_saisie'::app_role)
  );

-- 3. Unique constraint on executions for upsert
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_exec_st_exercice'
  ) THEN
    ALTER TABLE public.executions ADD CONSTRAINT unique_exec_st_exercice UNIQUE (sous_tache_id, exercice_id);
  END IF;
END $$;

-- 4. Cascade trigger: when budget lines change, update executions.montant_realise
CREATE OR REPLACE FUNCTION public.cascade_execution_from_lignes()
RETURNS TRIGGER AS $$
DECLARE
  v_st_id UUID;
  v_ex_id UUID;
  v_total_execute BIGINT;
BEGIN
  v_st_id := COALESCE(NEW.sous_tache_id, OLD.sous_tache_id);
  v_ex_id := COALESCE(NEW.exercice_id, OLD.exercice_id);

  SELECT COALESCE(SUM(montant_execute), 0) INTO v_total_execute
  FROM public.sous_tache_lignes_budgetaires
  WHERE sous_tache_id = v_st_id AND exercice_id = v_ex_id;

  INSERT INTO public.executions (sous_tache_id, exercice_id, montant_realise, date_maj, updated_by)
  VALUES (v_st_id, v_ex_id, v_total_execute, now(), auth.uid())
  ON CONFLICT (sous_tache_id, exercice_id)
  DO UPDATE SET montant_realise = v_total_execute, date_maj = now(), updated_by = auth.uid();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DROP TRIGGER IF EXISTS trg_cascade_lignes ON public.sous_tache_lignes_budgetaires;
CREATE TRIGGER trg_cascade_lignes
  AFTER INSERT OR UPDATE OR DELETE
  ON public.sous_tache_lignes_budgetaires
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_execution_from_lignes();

-- 5. Enable realtime for budget lines
ALTER PUBLICATION supabase_realtime ADD TABLE public.sous_tache_lignes_budgetaires;
