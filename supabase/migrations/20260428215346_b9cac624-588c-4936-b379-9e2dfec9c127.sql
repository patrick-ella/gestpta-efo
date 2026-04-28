
-- Table 1: KPI badge definitions
CREATE TABLE IF NOT EXISTS public.kpi_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  type_calcul TEXT NOT NULL DEFAULT 'seuils',
  is_active BOOLEAN NOT NULL DEFAULT true,
  ordre INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table 2: variables (criteria) feeding each KPI
CREATE TABLE IF NOT EXISTS public.kpi_variables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_badge_id UUID NOT NULL REFERENCES public.kpi_badges(id) ON DELETE CASCADE,
  variable_index INTEGER NOT NULL DEFAULT 1,
  extrant_id UUID NOT NULL REFERENCES public.extrants(id) ON DELETE CASCADE,
  critere_id UUID NOT NULL REFERENCES public.extrants_criteres(id) ON DELETE CASCADE,
  label_variable TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(kpi_badge_id, variable_index)
);

-- Table 3: threshold levels per badge
CREATE TABLE IF NOT EXISTS public.kpi_seuils (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_badge_id UUID NOT NULL REFERENCES public.kpi_badges(id) ON DELETE CASCADE,
  ordre INTEGER NOT NULL DEFAULT 0,
  label_statut TEXT NOT NULL,
  icon_statut TEXT,
  couleur TEXT DEFAULT '#1F4E79',
  bg_couleur TEXT DEFAULT '#EBF3FB',
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpi_variables_badge ON public.kpi_variables(kpi_badge_id);
CREATE INDEX IF NOT EXISTS idx_kpi_seuils_badge ON public.kpi_seuils(kpi_badge_id);

ALTER TABLE public.kpi_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_seuils ENABLE ROW LEVEL SECURITY;

-- Read-only for all authenticated
CREATE POLICY "read_kpi_badges" ON public.kpi_badges
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_kpi_variables" ON public.kpi_variables
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_kpi_seuils" ON public.kpi_seuils
  FOR SELECT TO authenticated USING (true);

-- Super admin only writes
CREATE POLICY "super_admin_kpi_badges_write" ON public.kpi_badges
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "super_admin_kpi_variables_write" ON public.kpi_variables
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "super_admin_kpi_seuils_write" ON public.kpi_seuils
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- Updated_at triggers
CREATE TRIGGER kpi_badges_set_updated
  BEFORE UPDATE ON public.kpi_badges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_meta();

CREATE TRIGGER kpi_seuils_set_updated
  BEFORE UPDATE ON public.kpi_seuils
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_meta();

-- Seed default badges
INSERT INTO public.kpi_badges (code, label, description, icon, type_calcul, ordre)
VALUES
  ('trainair_plus', 'Statut TRAINAIR PLUS', 'Niveau d''accréditation OACI TRAINAIR PLUS', '✈️', 'seuils', 1),
  ('avsec', 'Statut Centre AVSEC OACI', 'Statut du Centre de Formation AVSEC', '🛡️', 'seuils', 2),
  ('iso', 'Taux de conformité ISO', 'Taux de conformité aux normes ISO', '📋', 'valeur', 3),
  ('apprenants', 'Apprenants formés', 'Nombre total d''apprenants formés', '🎓', 'somme', 4)
ON CONFLICT (code) DO NOTHING;

-- Seed TRAINAIR PLUS thresholds
INSERT INTO public.kpi_seuils (kpi_badge_id, ordre, label_statut, icon_statut, couleur, bg_couleur, conditions)
SELECT b.id, s.ordre, s.label_statut, s.icon_statut, s.couleur, s.bg_couleur, s.conditions::jsonb
FROM public.kpi_badges b
CROSS JOIN (VALUES
  (0, 'TCE Platinum', '💎', '#4C1D95', '#F5F3FF',
   '[{"variable_index":1,"min_value":200},{"variable_index":2,"min_value":100}]'),
  (1, 'Full Gold', '🥇', '#78350F', '#FFFBEB',
   '[{"variable_index":1,"min_value":100},{"variable_index":2,"min_value":50}]'),
  (2, 'Associate Silver', '🥈', '#1F2937', '#F9FAFB',
   '[{"variable_index":1,"min_value":50},{"variable_index":2,"min_value":25}]'),
  (3, 'Associate Bronze', '🥉', '#92400E', '#FEF3C7',
   '[{"variable_index":1,"min_value":0},{"variable_index":2,"min_value":0}]')
) AS s(ordre, label_statut, icon_statut, couleur, bg_couleur, conditions)
WHERE b.code = 'trainair_plus'
  AND NOT EXISTS (SELECT 1 FROM public.kpi_seuils ks WHERE ks.kpi_badge_id = b.id);
