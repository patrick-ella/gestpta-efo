import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface SousTacheLivrable {
  id: string;
  sous_tache_id: string | null;
  tache_id: string;
  libelle: string;
  type_livrable: string | null;
  statut: string | null;
  date_echeance: string | null;
  date_production: string | null;
  fichier_url: string | null;
  fichier_nom: string | null;
  fichier_taille: number | null;
  commentaire: string | null;
  produit: boolean | null;
  produit_par: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string | null;
}

export const useSousTacheLivrables = (sousTacheId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sous-tache-livrables", sousTacheId],
    queryFn: async () => {
      if (!sousTacheId) return [];
      const { data, error } = await supabase
        .from("livrables")
        .select("*")
        .eq("sous_tache_id", sousTacheId)
        .order("created_at");
      if (error) throw error;
      return data as SousTacheLivrable[];
    },
    enabled: !!sousTacheId && !!user,
  });

  const createLivrable = useMutation({
    mutationFn: async (payload: {
      sous_tache_id: string;
      tache_id: string;
      libelle: string;
      type_livrable: string;
      statut: string;
      date_echeance?: string | null;
      commentaire?: string | null;
      fichier_url?: string | null;
      fichier_nom?: string | null;
      fichier_taille?: number | null;
    }) => {
      const { data, error } = await supabase
        .from("livrables")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;

      // Audit log
      await supabase.from("journal_audit").insert({
        user_id: user?.id,
        action: "CREATE",
        entite: "livrable",
        nouvelle_valeur: data as any,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sous-tache-livrables", sousTacheId] });
      queryClient.invalidateQueries({ queryKey: ["livrables-full"] });
      toast.success("Livrable ajouté avec succès ✅");
    },
    onError: () => toast.error("Erreur lors de l'ajout du livrable"),
  });

  const updateLivrable = useMutation({
    mutationFn: async (payload: {
      id: string;
      libelle?: string;
      type_livrable?: string;
      statut?: string;
      date_echeance?: string | null;
      date_production?: string | null;
      commentaire?: string | null;
      fichier_url?: string | null;
      fichier_nom?: string | null;
      fichier_taille?: number | null;
      produit?: boolean;
    }) => {
      const { id, ...updates } = payload;

      // Get old value for audit
      const { data: oldData } = await supabase
        .from("livrables")
        .select("*")
        .eq("id", id)
        .single();

      const { data, error } = await supabase
        .from("livrables")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      await supabase.from("journal_audit").insert({
        user_id: user?.id,
        action: "UPDATE",
        entite: "livrable",
        ancienne_valeur: oldData as any,
        nouvelle_valeur: data as any,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sous-tache-livrables", sousTacheId] });
      queryClient.invalidateQueries({ queryKey: ["livrables-full"] });
      toast.success("Livrable mis à jour ✅");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const deleteLivrable = useMutation({
    mutationFn: async ({ id, fichierUrl }: { id: string; fichierUrl?: string | null }) => {
      // Get old value for audit
      const { data: oldData } = await supabase
        .from("livrables")
        .select("*")
        .eq("id", id)
        .single();

      // Delete file from storage if exists
      if (fichierUrl) {
        const urlParts = fichierUrl.split("/livrables-pta/");
        if (urlParts.length > 1) {
          await supabase.storage
            .from("livrables-pta")
            .remove([decodeURIComponent(urlParts[1])]);
        }
      }

      const { error } = await supabase.from("livrables").delete().eq("id", id);
      if (error) throw error;

      await supabase.from("journal_audit").insert({
        user_id: user?.id,
        action: "DELETE",
        entite: "livrable",
        ancienne_valeur: oldData as any,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sous-tache-livrables", sousTacheId] });
      queryClient.invalidateQueries({ queryKey: ["livrables-full"] });
      toast.success("Livrable supprimé");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const uploadFile = async (file: File, livrableId: string): Promise<{ url: string; name: string; size: number }> => {
    const ext = file.name.split(".").pop();
    const path = `${sousTacheId}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("livrables-pta")
      .upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("livrables-pta")
      .getPublicUrl(path);

    return { url: publicUrl, name: file.name, size: file.size };
  };

  return { ...query, createLivrable, updateLivrable, deleteLivrable, uploadFile };
};
