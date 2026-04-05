
-- Table 1: Agent profile extension
CREATE TABLE public.agents_profils (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.users_profiles(id) ON DELETE CASCADE,
  matricule TEXT,
  direction TEXT,
  service TEXT,
  poste_travail TEXT,
  superieur_id UUID REFERENCES public.users_profiles(id),
  date_recrutement DATE,
  date_reclassement DATE,
  anciennete_poste TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table 2: Assignment of sous-tâches to agents (PTI)
CREATE TABLE public.assignations_sous_taches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sous_tache_id UUID NOT NULL REFERENCES public.sous_taches(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.users_profiles(id),
  exercice_id UUID NOT NULL REFERENCES public.exercices(id),
  role_agent TEXT NOT NULL DEFAULT 'contributeur',
  poids_objectif NUMERIC(5,2) NOT NULL DEFAULT 0,
  date_limite DATE,
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  UNIQUE(sous_tache_id, agent_id, exercice_id)
);

-- Table 3: Evaluation records per agent per exercice
CREATE TABLE public.evaluations_agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.users_profiles(id),
  exercice_id UUID NOT NULL REFERENCES public.exercices(id),
  evaluateur_id UUID REFERENCES public.users_profiles(id),
  comp_assiduite NUMERIC(2,1),
  comp_responsabilite NUMERIC(2,1),
  comp_communication NUMERIC(2,1),
  comp_quantite_travail NUMERIC(2,1),
  comp_qualite_travail NUMERIC(2,1),
  comp_esprit_critique NUMERIC(2,1),
  comp_organisation NUMERIC(2,1),
  comp_actualisation NUMERIC(2,1),
  comp_initiative NUMERIC(2,1),
  comp_discretion NUMERIC(2,1),
  comp_habiletes NUMERIC(2,1),
  actions_comp JSONB DEFAULT '{}',
  responsabilite_r1 TEXT,
  responsabilite_r2 TEXT,
  responsabilite_r3 TEXT,
  responsabilite_r4 TEXT,
  responsabilite_r5 TEXT,
  modifications_taches TEXT,
  points_forts TEXT,
  points_ameliorer TEXT,
  besoins_formation JSONB DEFAULT '[]',
  elements_favorables TEXT,
  elements_defavorables TEXT,
  commentaire_agent TEXT,
  commentaire_evaluateur TEXT,
  note_realisation NUMERIC(4,2),
  note_comp_comportement NUMERIC(4,2),
  note_comp_performance NUMERIC(4,2),
  note_comp_pro NUMERIC(4,2),
  note_globale NUMERIC(4,2),
  appreciation_globale TEXT,
  statut TEXT DEFAULT 'brouillon',
  date_evaluation DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, exercice_id)
);

-- Indexes
CREATE INDEX idx_assignations_agent ON public.assignations_sous_taches(agent_id);
CREATE INDEX idx_assignations_sous_tache ON public.assignations_sous_taches(sous_tache_id);
CREATE INDEX idx_assignations_exercice ON public.assignations_sous_taches(exercice_id);
CREATE INDEX idx_evaluations_agent ON public.evaluations_agents(agent_id);
CREATE INDEX idx_evaluations_exercice ON public.evaluations_agents(exercice_id);

-- RLS
ALTER TABLE public.agents_profils ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignations_sous_taches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations_agents ENABLE ROW LEVEL SECURITY;

-- agents_profils policies
CREATE POLICY "read_agents_profils" ON public.agents_profils
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "write_agents_profils" ON public.agents_profils
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin_pta'::app_role)
  );

-- assignations policies
CREATE POLICY "read_assignations" ON public.assignations_sous_taches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "write_assignations" ON public.assignations_sous_taches
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin_pta'::app_role)
    OR public.has_role(auth.uid(), 'responsable_activite'::app_role)
  );

-- evaluations policies
CREATE POLICY "read_evaluations" ON public.evaluations_agents
  FOR SELECT TO authenticated USING (
    agent_id = auth.uid()
    OR evaluateur_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin_pta'::app_role)
  );

CREATE POLICY "write_evaluations" ON public.evaluations_agents
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin_pta'::app_role)
    OR evaluateur_id = auth.uid()
  );
