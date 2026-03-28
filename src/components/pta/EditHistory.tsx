import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Clock, ChevronDown } from "lucide-react";

interface Props {
  entite: string;
  code: string;
}

const EditHistory = ({ entite, code }: Props) => {
  const [open, setOpen] = useState(false);

  const { data: history = [] } = useQuery({
    queryKey: ["edit-history", entite, code],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_audit")
        .select("*")
        .eq("action", "UPDATE")
        .eq("entite", entite)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      // Filter client-side by reference in nouvelle_valeur
      const filtered = (data ?? []).filter((row) => {
        const nv = row.nouvelle_valeur as any;
        return nv?.reference === code;
      });
      return filtered.slice(0, 5);
    },
    enabled: open,
  });

  // Fetch profiles for user names
  const userIds = [...new Set(history.map((h) => h.user_id).filter(Boolean))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-for-history", userIds],
    queryFn: async () => {
      if (!userIds.length) return [];
      const { data } = await supabase.from("users_profiles").select("id, nom, prenom").in("id", userIds);
      return data ?? [];
    },
    enabled: userIds.length > 0,
  });

  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, `${p.prenom ?? ""} ${p.nom ?? ""}`.trim() || "Utilisateur"]));

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <Clock className="h-3 w-3" />
        Historique des modifications
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Aucune modification enregistrée</p>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {history.map((h) => {
              const date = new Date(h.created_at);
              const av = h.ancienne_valeur as any;
              const nv = h.nouvelle_valeur as any;
              const changes: string[] = [];
              if (av?.libelle !== nv?.libelle) changes.push(`Libellé : "${av?.libelle?.slice(0, 40)}…" → "${nv?.libelle?.slice(0, 40)}…"`);
              if (av?.objectif_operationnel !== nv?.objectif_operationnel) changes.push("Objectif opérationnel modifié");
              if (av?.livrables !== nv?.livrables) changes.push("Livrables modifiés");
              return (
                <div key={h.id} className="text-xs border-l-2 border-muted pl-2 py-1">
                  <div className="font-medium text-foreground">
                    {date.toLocaleDateString("fr-FR")} {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    {" — "}{profileMap[h.user_id ?? ""] ?? "Système"}
                  </div>
                  {changes.map((c, i) => (
                    <div key={i} className="text-muted-foreground">{c}</div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default EditHistory;
