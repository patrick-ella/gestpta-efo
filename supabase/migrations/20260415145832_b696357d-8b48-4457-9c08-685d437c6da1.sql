
ALTER TABLE public.extrants_preuves
  ADD COLUMN IF NOT EXISTS type_preuve TEXT NOT NULL DEFAULT 'fichier',
  ADD COLUMN IF NOT EXISTS url_lien TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS plateforme TEXT DEFAULT NULL;

-- Make fichier columns nullable for URL proofs
ALTER TABLE public.extrants_preuves
  ALTER COLUMN fichier_url DROP NOT NULL,
  ALTER COLUMN fichier_nom DROP NOT NULL;
