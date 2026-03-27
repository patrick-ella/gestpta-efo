
-- Add new columns to livrables (date_production and fichier_url already exist)
ALTER TABLE public.livrables
  ADD COLUMN IF NOT EXISTS sous_tache_id UUID REFERENCES public.sous_taches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS type_livrable TEXT DEFAULT 'document',
  ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'non_produit',
  ADD COLUMN IF NOT EXISTS date_echeance DATE,
  ADD COLUMN IF NOT EXISTS fichier_nom TEXT,
  ADD COLUMN IF NOT EXISTS fichier_taille BIGINT,
  ADD COLUMN IF NOT EXISTS commentaire TEXT,
  ADD COLUMN IF NOT EXISTS produit_par UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create index on sous_tache_id
CREATE INDEX IF NOT EXISTS idx_livrables_sous_tache_id ON public.livrables(sous_tache_id);

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins or agents manage livrables" ON public.livrables;
DROP POLICY IF EXISTS "Authenticated read livrables" ON public.livrables;

-- SELECT: all authenticated
CREATE POLICY "Authenticated read livrables" ON public.livrables
  FOR SELECT TO authenticated USING (true);

-- INSERT/UPDATE: super_admin, admin_pta, responsable_activite, agent_saisie
CREATE POLICY "Manage livrables insert" ON public.livrables
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_pta'::app_role)
    OR has_role(auth.uid(), 'responsable_activite'::app_role)
    OR has_role(auth.uid(), 'agent_saisie'::app_role)
  );

CREATE POLICY "Manage livrables update" ON public.livrables
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_pta'::app_role)
    OR has_role(auth.uid(), 'responsable_activite'::app_role)
    OR has_role(auth.uid(), 'agent_saisie'::app_role)
  );

-- DELETE: super_admin, admin_pta only
CREATE POLICY "Admins delete livrables" ON public.livrables
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_pta'::app_role)
  );
