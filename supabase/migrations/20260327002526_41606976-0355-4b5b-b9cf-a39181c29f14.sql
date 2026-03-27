
-- Fix the overly permissive audit insert policy
DROP POLICY IF EXISTS "System inserts audit" ON public.journal_audit;
CREATE POLICY "Authenticated users insert audit" ON public.journal_audit 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);
