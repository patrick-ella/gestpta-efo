CREATE POLICY "update_preuves"
ON public.extrants_preuves
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_pta'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_pta'::app_role));