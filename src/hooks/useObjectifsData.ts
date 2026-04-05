import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAgentsProfils = () =>
  useQuery({
    queryKey: ["agents-profils"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents_profils")
        .select("*, users_profiles!agents_profils_user_id_fkey(id, nom, prenom, email, centre, actif)");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAllProfiles = () =>
  useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users_profiles")
        .select("*")
        .eq("actif", true)
        .order("nom");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAssignations = (exerciceId: string | null) =>
  useQuery({
    queryKey: ["assignations", exerciceId],
    queryFn: async () => {
      if (!exerciceId) return [];
      const { data, error } = await supabase
        .from("assignations_sous_taches")
        .select("*")
        .eq("exercice_id", exerciceId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!exerciceId,
  });

export const useAgentAssignations = (agentId: string | null, exerciceId: string | null) =>
  useQuery({
    queryKey: ["agent-assignations", agentId, exerciceId],
    queryFn: async () => {
      if (!agentId || !exerciceId) return [];
      const { data, error } = await supabase
        .from("assignations_sous_taches")
        .select("*")
        .eq("agent_id", agentId)
        .eq("exercice_id", exerciceId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!agentId && !!exerciceId,
  });

export const useSousTacheAssignations = (sousTacheId: string | null) =>
  useQuery({
    queryKey: ["st-assignations", sousTacheId],
    queryFn: async () => {
      if (!sousTacheId) return [];
      const { data, error } = await supabase
        .from("assignations_sous_taches")
        .select("*")
        .eq("sous_tache_id", sousTacheId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!sousTacheId,
  });

export const useEvaluations = (exerciceId: string | null) =>
  useQuery({
    queryKey: ["evaluations", exerciceId],
    queryFn: async () => {
      if (!exerciceId) return [];
      const { data, error } = await supabase
        .from("evaluations_agents")
        .select("*")
        .eq("exercice_id", exerciceId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!exerciceId,
  });
