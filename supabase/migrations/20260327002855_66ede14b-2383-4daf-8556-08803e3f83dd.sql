
-- Create indicateurs_kpi table
CREATE TABLE public.indicateurs_kpi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  libelle TEXT NOT NULL,
  categorie TEXT,
  baseline_annee INT,
  baseline_valeur TEXT,
  cible_2025 TEXT,
  cible_2026 TEXT,
  cible_2027 TEXT,
  valeur_realisee TEXT,
  mode_calcul TEXT DEFAULT 'manuel',
  objectif_specifique TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.indicateurs_kpi ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
CREATE POLICY "Authenticated read indicateurs" ON public.indicateurs_kpi
  FOR SELECT TO authenticated USING (true);

-- Admins can manage
CREATE POLICY "Admins manage indicateurs" ON public.indicateurs_kpi
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_pta'::app_role));

-- Seed the 4 KPIs
INSERT INTO public.indicateurs_kpi (code, libelle, categorie, baseline_annee, baseline_valeur, cible_2025, cible_2026, cible_2027, mode_calcul) VALUES
('SP3-OBJ', 'Taux de conformité aux exigences aéronautiques (Navigation, Sûreté, EFO, SAR)', 'Sous-programme 3', 2024, 'ND', '100%', '100%', '100%', 'manuel'),
('OS1-IND1', 'Nombre d''apprenants formés', 'Objectif Spécifique 1', 2024, '1 020', '1 100', '1 200', '1 500', 'auto'),
('OS2-IND1', 'Niveau de reconnaissance et accréditation OACI (TRAINAIR PLUS + Centre AVSEC)', 'Objectif Spécifique 2', 2024, 'Silver + AVSEC', 'Gold (Full member) + AVSEC', 'Gold + AVSEC', 'Gold + AVSEC', 'manuel'),
('OS2-IND2', 'Taux de conformité aux normes de certification ISO', 'Objectif Spécifique 2', 2024, '80%', '80%', '82,5%', '85%', 'auto');
