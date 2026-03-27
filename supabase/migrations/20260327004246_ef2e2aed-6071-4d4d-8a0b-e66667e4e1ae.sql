
-- Create storage bucket for livrables
INSERT INTO storage.buckets (id, name, public) VALUES ('livrables-pta', 'livrables-pta', true);

-- RLS policies for storage
CREATE POLICY "Authenticated users can view livrables files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'livrables-pta');

CREATE POLICY "Authorized users can upload livrables files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'livrables-pta' AND (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin_pta') OR
    public.has_role(auth.uid(), 'responsable_activite') OR
    public.has_role(auth.uid(), 'agent_saisie')
  )
);

CREATE POLICY "Admins can delete livrables files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'livrables-pta' AND (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin_pta')
  )
);
