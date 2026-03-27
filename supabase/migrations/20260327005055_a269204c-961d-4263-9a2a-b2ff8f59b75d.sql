
DROP POLICY IF EXISTS "System inserts notifications" ON public.notifications;

CREATE POLICY "Admins and system insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin_pta') OR
  auth.uid() = user_id
);
