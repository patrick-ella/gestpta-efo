
-- Create extrants_preuves table
CREATE TABLE public.extrants_preuves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  extrant_id UUID NOT NULL REFERENCES public.extrants(id) ON DELETE CASCADE,
  libelle TEXT NOT NULL,
  fichier_url TEXT NOT NULL,
  fichier_nom TEXT NOT NULL,
  fichier_taille BIGINT,
  fichier_type TEXT,
  depose_par UUID NOT NULL,
  depose_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_extrants_preuves_extrant_id ON public.extrants_preuves(extrant_id);

-- Enable RLS
ALTER TABLE public.extrants_preuves ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "read_preuves" ON public.extrants_preuves
  FOR SELECT TO authenticated USING (true);

-- Insert: all except consultant (use has_role)
CREATE POLICY "insert_preuves" ON public.extrants_preuves
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_pta'::app_role)
    OR has_role(auth.uid(), 'responsable_activite'::app_role)
    OR has_role(auth.uid(), 'agent_saisie'::app_role)
  );

-- Delete: admins only
CREATE POLICY "delete_preuves" ON public.extrants_preuves
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_pta'::app_role)
  );

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('extrants-preuves', 'extrants-preuves', false);

-- Storage: download for all authenticated
CREATE POLICY "download_preuves_storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'extrants-preuves');

-- Storage: upload for authorized roles
CREATE POLICY "upload_preuves_storage" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'extrants-preuves'
    AND (
      has_role(auth.uid(), 'super_admin'::app_role)
      OR has_role(auth.uid(), 'admin_pta'::app_role)
      OR has_role(auth.uid(), 'responsable_activite'::app_role)
      OR has_role(auth.uid(), 'agent_saisie'::app_role)
    )
  );

-- Storage: delete for admins only
CREATE POLICY "delete_preuves_storage" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'extrants-preuves'
    AND (
      has_role(auth.uid(), 'super_admin'::app_role)
      OR has_role(auth.uid(), 'admin_pta'::app_role)
    )
  );
