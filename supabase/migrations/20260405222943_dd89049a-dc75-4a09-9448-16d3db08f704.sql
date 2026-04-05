
-- 1. Add columns
ALTER TABLE public.agents_profils
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS nom TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS prenom TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS actif BOOLEAN NOT NULL DEFAULT true;

-- 2. Populate from users_profiles
UPDATE public.agents_profils ap
SET email = up.email, nom = COALESCE(up.nom, ''), prenom = COALESCE(up.prenom, '')
FROM public.users_profiles up WHERE ap.user_id = up.id AND ap.email IS NULL;

-- 3. Drop ALL old FKs first
ALTER TABLE public.assignations_sous_taches DROP CONSTRAINT IF EXISTS assignations_sous_taches_agent_id_fkey;
ALTER TABLE public.evaluations_agents DROP CONSTRAINT IF EXISTS evaluations_agents_agent_id_fkey;
ALTER TABLE public.agents_profils DROP CONSTRAINT IF EXISTS agents_profils_superieur_id_fkey;

-- 4. Create agents_profils for users with assignations but no agent profile
INSERT INTO public.agents_profils (user_id, email, nom, prenom)
SELECT DISTINCT up.id, up.email, COALESCE(up.nom, ''), COALESCE(up.prenom, '')
FROM public.assignations_sous_taches ast
JOIN public.users_profiles up ON up.id = ast.agent_id
WHERE NOT EXISTS (SELECT 1 FROM public.agents_profils ap WHERE ap.user_id = ast.agent_id);

-- 4b. Same for evaluations
INSERT INTO public.agents_profils (user_id, email, nom, prenom)
SELECT DISTINCT up.id, up.email, COALESCE(up.nom, ''), COALESCE(up.prenom, '')
FROM public.evaluations_agents ea
JOIN public.users_profiles up ON up.id = ea.agent_id
WHERE NOT EXISTS (SELECT 1 FROM public.agents_profils ap WHERE ap.user_id = ea.agent_id)
ON CONFLICT DO NOTHING;

-- 5. Migrate assignations.agent_id: users_profiles.id → agents_profils.id
UPDATE public.assignations_sous_taches ast
SET agent_id = ap.id
FROM public.agents_profils ap WHERE ap.user_id = ast.agent_id;

-- 6. Migrate evaluations.agent_id: users_profiles.id → agents_profils.id
UPDATE public.evaluations_agents ea
SET agent_id = ap.id
FROM public.agents_profils ap WHERE ap.user_id = ea.agent_id;

-- 7. Clear superieur_id (points to users_profiles, will be re-resolved)
UPDATE public.agents_profils SET superieur_id = NULL WHERE superieur_id IS NOT NULL;

-- 8. Make user_id nullable
ALTER TABLE public.agents_profils ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.agents_profils DROP CONSTRAINT IF EXISTS agents_profils_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS agents_profils_user_id_unique ON public.agents_profils(user_id) WHERE user_id IS NOT NULL;

-- 9. Unique email
ALTER TABLE public.agents_profils ADD CONSTRAINT agents_profils_email_unique UNIQUE (email);

-- 10. Add new FKs referencing agents_profils
ALTER TABLE public.agents_profils ADD CONSTRAINT agents_profils_superieur_id_fkey FOREIGN KEY (superieur_id) REFERENCES public.agents_profils(id);
ALTER TABLE public.assignations_sous_taches ADD CONSTRAINT assignations_sous_taches_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents_profils(id) ON DELETE CASCADE;
ALTER TABLE public.evaluations_agents ADD CONSTRAINT evaluations_agents_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents_profils(id) ON DELETE CASCADE;

-- 11. Update RLS
DROP POLICY IF EXISTS "read_agents_profils" ON public.agents_profils;
DROP POLICY IF EXISTS "write_agents_profils" ON public.agents_profils;
CREATE POLICY "read_agents_profils" ON public.agents_profils FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_agents_profils" ON public.agents_profils FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin_pta'::app_role)
);
