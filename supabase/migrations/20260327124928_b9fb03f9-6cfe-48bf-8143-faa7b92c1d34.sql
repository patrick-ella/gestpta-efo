
CREATE INDEX IF NOT EXISTS idx_executions_sous_tache_exercice ON public.executions(sous_tache_id, exercice_id);
CREATE INDEX IF NOT EXISTS idx_sous_taches_tache_id ON public.sous_taches(tache_id);
CREATE INDEX IF NOT EXISTS idx_taches_activite_id ON public.taches(activite_id);
CREATE INDEX IF NOT EXISTS idx_journal_audit_created_at ON public.journal_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_lue ON public.notifications(user_id, lue);
CREATE INDEX IF NOT EXISTS idx_activites_exercice_id ON public.activites(exercice_id);
