-- Insert deposit_oaci KPI badge and seuils
INSERT INTO public.kpi_badges (code, label, description, icon, type_calcul, ordre)
VALUES (
  'deposit_oaci',
  'Valeur déposit EFO — Compte EI0028',
  'Solde du compte de dépôt de l''EFO à l''OACI (Compte No. EI0028) pour le financement des formations TRAINAIR PLUS',
  '💰',
  'valeur',
  5
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.kpi_seuils (kpi_badge_id, ordre, label_statut, icon_statut, couleur, bg_couleur, conditions)
SELECT id, 0, 'Solde suffisant', '✅', '#15803D', '#F0FDF4', '[{"variable_index":1,"min_value":25000}]'::jsonb
FROM public.kpi_badges WHERE code = 'deposit_oaci'
AND NOT EXISTS (SELECT 1 FROM public.kpi_seuils s WHERE s.kpi_badge_id = public.kpi_badges.id AND s.ordre = 0);

INSERT INTO public.kpi_seuils (kpi_badge_id, ordre, label_statut, icon_statut, couleur, bg_couleur, conditions)
SELECT id, 1, 'Alerte : Solde déjà bas — rechargement requis', '⚠️', '#DC2626', '#FEF2F2', '[{"variable_index":1,"min_value":1}]'::jsonb
FROM public.kpi_badges WHERE code = 'deposit_oaci'
AND NOT EXISTS (SELECT 1 FROM public.kpi_seuils s WHERE s.kpi_badge_id = public.kpi_badges.id AND s.ordre = 1);

INSERT INTO public.kpi_seuils (kpi_badge_id, ordre, label_statut, icon_statut, couleur, bg_couleur, conditions)
SELECT id, 2, 'Solde non renseigné', 'ℹ️', '#6B7280', '#F9FAFB', '[{"variable_index":1,"min_value":0}]'::jsonb
FROM public.kpi_badges WHERE code = 'deposit_oaci'
AND NOT EXISTS (SELECT 1 FROM public.kpi_seuils s WHERE s.kpi_badge_id = public.kpi_badges.id AND s.ordre = 2);