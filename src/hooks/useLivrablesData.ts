import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface LivrableRow {
  id: string;
  libelle: string;
  produit: boolean | null;
  date_production: string | null;
  fichier_url: string | null;
  observations: string | null;
  tache_id: string;
  created_at: string;
}

export interface TacheWithLivrables {
  id: string;
  code: string;
  libelle: string;
  livrables_text: string | null;
  livrables: LivrableRow[];
}

export interface ActiviteGrouped {
  id: string;
  code: string;
  libelle: string;
  taches: TacheWithLivrables[];
}

export const useLivrablesData = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["livrables-full"],
    queryFn: async () => {
      const [{ data: activites }, { data: taches }, { data: livrables }] =
        await Promise.all([
          supabase.from("activites").select("*").order("ordre"),
          supabase.from("taches").select("*").order("ordre"),
          supabase.from("livrables").select("*").order("created_at"),
        ]);

      if (!activites || !taches || !livrables) return [];

      const grouped: ActiviteGrouped[] = activites.map((a) => ({
        id: a.id,
        code: a.code,
        libelle: a.libelle,
        taches: taches
          .filter((t) => t.activite_id === a.id)
          .map((t) => ({
            id: t.id,
            code: t.code,
            libelle: t.libelle,
            livrables_text: t.livrables,
            livrables: livrables.filter((l) => l.tache_id === t.id),
          })),
      }));

      return grouped;
    },
    enabled: !!user,
  });

  const updateLivrable = useMutation({
    mutationFn: async (payload: {
      id: string;
      produit?: boolean;
      date_production?: string | null;
      observations?: string | null;
      fichier_url?: string | null;
    }) => {
      const { id, ...updates } = payload;
      const { error } = await supabase
        .from("livrables")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["livrables-full"] });
      toast.success("Livrable mis à jour avec succès");
    },
    onError: () => toast.error("Erreur lors de la mise à jour du livrable"),
  });

  const deleteLivrable = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("livrables").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["livrables-full"] });
      toast.success("Livrable supprimé");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  return { ...query, updateLivrable, deleteLivrable };
};

export const useUploadFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      livrableId,
    }: {
      file: File;
      livrableId: string;
      onProgress?: (pct: number) => void;
    }) => {
      const ext = file.name.split(".").pop();
      const path = `${livrableId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("livrables-pta")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("livrables-pta").getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("livrables")
        .update({ fichier_url: publicUrl })
        .eq("id", livrableId);

      if (updateError) throw updateError;
      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["livrables-full"] });
      toast.success("Fichier téléversé avec succès");
    },
    onError: () => toast.error("Erreur lors du téléversement du fichier"),
  });
};

export const useDeleteFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      livrableId,
      fileUrl,
    }: {
      livrableId: string;
      fileUrl: string;
    }) => {
      // Extract path from URL
      const urlParts = fileUrl.split("/livrables-pta/");
      if (urlParts.length > 1) {
        await supabase.storage
          .from("livrables-pta")
          .remove([decodeURIComponent(urlParts[1])]);
      }

      const { error } = await supabase
        .from("livrables")
        .update({ fichier_url: null })
        .eq("id", livrableId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["livrables-full"] });
      toast.success("Fichier supprimé");
    },
    onError: () => toast.error("Erreur lors de la suppression du fichier"),
  });
};
