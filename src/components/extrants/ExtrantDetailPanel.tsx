import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import type { Extrant } from "@/hooks/useExtrantsData";

interface Props {
  extrant: Extrant | null;
  activiteId: string | null;
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onUpdate: () => void;
}

const statutConfig: Record<string, { label: string; emoji: string; color: string }> = {
  non_produit: { label: "Non produit", emoji: "❌", color: "bg-muted text-muted-foreground" },
  en_cours: { label: "En cours", emoji: "⏳", color: "bg-warning/20 text-warning-foreground" },
  produit: { label: "Produit", emoji: "✅", color: "bg-success/20 text-success-foreground" },
  valide: { label: "Validé", emoji: "✔️", color: "bg-primary/20 text-primary" },
  rejete: { label: "Rejeté", emoji: "🔄", color: "bg-destructive/20 text-destructive" },
};

const ExtrantDetailPanel = ({ extrant, activiteId, open, onClose, isAdmin, onUpdate }: Props) => {
  const { user } = useAuth();
  const [rejectMotif, setRejectMotif] = useState("");
  const [showReject, setShowReject] = useState(false);

  // Fetch linked sous-tâches info
  const { data: linkedSousTaches = [] } = useQuery({
    queryKey: ["extrant-linked-st", extrant?.id],
    queryFn: async () => {
      if (!extrant?.criteres?.length) return [];
      const critereIds = extrant.criteres.map((c) => c.id);
      const { data: liens } = await supabase
        .from("criteres_sous_taches")
        .select("critere_id, sous_tache_id, condition_type")
        .in("critere_id", critereIds);
      if (!liens?.length) return [];

      const stIds = [...new Set(liens.map((l: any) => l.sous_tache_id))];
      const { data: sts } = await supabase
        .from("sous_taches")
        .select("id, code, libelle")
        .in("id", stIds);

      const { data: execs } = await supabase
        .from("executions")
        .select("sous_tache_id, avancement_pct")
        .in("sous_tache_id", stIds);

      const execMap: Record<string, number> = {};
      (execs ?? []).forEach((e: any) => { execMap[e.sous_tache_id] = e.avancement_pct ?? 0; });

      return (sts ?? []).map((st: any) => {
        const stLiens = liens!.filter((l: any) => l.sous_tache_id === st.id);
        const critereNames = stLiens.map((l: any) => {
          const c = extrant.criteres?.find((cr) => cr.id === l.critere_id);
          return c ? c.libelle.substring(0, 30) : "";
        });
        return {
          ...st,
          avancement: execMap[st.id] ?? 0,
          criteresLies: critereNames,
        };
      });
    },
    enabled: !!extrant?.id,
  });

  if (!extrant) return null;

  const st = statutConfig[extrant.statut] || statutConfig.non_produit;
  const totalCrit = extrant.criteres?.length ?? 0;
  const validCrit = extrant.criteres?.filter((c) => c.valide_final).length ?? 0;

  const handleValidate = async () => {
    await supabase.from("extrants").update({
      statut: "valide", statut_mode: "manuel",
      date_validation: new Date().toISOString().split("T")[0],
      valide_par: user?.id,
    }).eq("id", extrant.id);
    await supabase.from("journal_audit").insert({
      user_id: user?.id ?? null, action: "VALIDATE", entite: "extrant",
      nouvelle_valeur: { reference: extrant.reference, statut: "valide" },
    });
    toast.success(`✔️ Extrant ${extrant.reference} validé`);
    onUpdate();
    onClose();
  };

  const handleReject = async () => {
    if (!rejectMotif.trim()) return;
    await supabase.from("extrants").update({
      statut: "rejete", statut_mode: "manuel", rejete_motif: rejectMotif,
    }).eq("id", extrant.id);
    await supabase.from("journal_audit").insert({
      user_id: user?.id ?? null, action: "REJECT", entite: "extrant",
      nouvelle_valeur: { reference: extrant.reference, statut: "rejete", motif: rejectMotif },
    });
    toast.success(`🔄 Extrant ${extrant.reference} rejeté`);
    onUpdate();
    onClose();
  };

  const handleResetAuto = async () => {
    await supabase.from("extrants").update({ statut_mode: "auto" }).eq("id", extrant.id);
    await supabase.rpc("recalculate_extrant_statut", { p_extrant_id: extrant.id });
    toast.success("Statut remis en calcul automatique");
    onUpdate();
  };

  const handleToggleCritereManuel = async (critereId: string, checked: boolean) => {
    await supabase.from("extrants_criteres").update({ valide_manuellement: checked }).eq("id", critereId);
    await supabase.rpc("recalculate_extrant_statut", { p_extrant_id: extrant.id });
    onUpdate();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">{extrant.reference}</Badge>
            <span className="text-foreground">{extrant.libelle}</span>
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="info">📋 Informations</TabsTrigger>
            <TabsTrigger value="criteres">✅ Critères</TabsTrigger>
            <TabsTrigger value="sous-taches">🔗 Sous-tâches</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Référence</Label>
              <Badge variant="outline" className="text-sm font-mono">{extrant.reference}</Badge>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Libellé</Label>
              <p className="text-sm font-medium text-foreground">{extrant.libelle}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Indicateur de mesure</Label>
              <p className="text-sm text-foreground italic">{extrant.indicateur_mesure}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Statut actuel</Label>
              <Badge className={st.color}>{st.emoji} {st.label}</Badge>
              {extrant.statut_mode === "manuel" && <span className="text-xs text-muted-foreground ml-2">(manuel)</span>}
            </div>
            {extrant.date_production && (
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Date de production</Label>
                <p className="text-sm text-foreground">{extrant.date_production}</p>
              </div>
            )}
            {extrant.rejete_motif && (
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Motif de rejet</Label>
                <p className="text-sm text-destructive">{extrant.rejete_motif}</p>
              </div>
            )}

            {/* Admin actions */}
            {isAdmin && extrant.statut === "produit" && (
              <div className="flex gap-2 pt-4 border-t">
                <Button size="sm" onClick={handleValidate}>✔️ Valider cet extrant</Button>
                <Button size="sm" variant="destructive" onClick={() => setShowReject(true)}>🔄 Rejeter</Button>
              </div>
            )}
            {isAdmin && showReject && (
              <div className="space-y-2 p-3 border rounded-lg">
                <Label className="text-sm">Motif de rejet *</Label>
                <Textarea value={rejectMotif} onChange={(e) => setRejectMotif(e.target.value)} placeholder="Expliquez le motif..." />
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={handleReject} disabled={!rejectMotif.trim()}>Confirmer le rejet</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowReject(false)}>Annuler</Button>
                </div>
              </div>
            )}
            {isAdmin && (extrant.statut === "valide" || extrant.statut === "rejete") && (
              <Button size="sm" variant="outline" onClick={handleResetAuto} className="mt-2">↩️ Remettre en calcul automatique</Button>
            )}
          </TabsContent>

          <TabsContent value="criteres" className="space-y-3 mt-4">
            {totalCrit === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun critère défini pour cet extrant.</p>
            ) : (
              extrant.criteres?.map((c) => {
                const typeLabel = c.type_critere === "binaire" ? "Binaire" : c.type_critere === "date" ? "Date" : "Quantitatif";
                return (
                  <div key={c.id} className="p-3 border rounded-lg space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg ${c.valide_final ? "text-success-foreground" : "text-muted-foreground"}`}>
                        {c.valide_final ? "✅" : "❌"}
                      </span>
                      <span className="text-sm font-medium text-foreground">{c.libelle}</span>
                      <Badge variant="outline" className="text-xs">{typeLabel}</Badge>
                    </div>
                    {c.type_critere === "date" && c.date_echeance && (
                      <p className="text-xs text-muted-foreground">Échéance : {c.date_echeance}</p>
                    )}
                    {c.type_critere === "quantitatif" && c.seuil_valeur != null && (
                      <p className="text-xs text-muted-foreground">Seuil : {c.seuil_valeur} {c.seuil_unite ?? ""}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {c.valide_auto ? "✅ Validé automatiquement" : c.valide_manuellement ? "✅ Validé manuellement" : "⏳ En attente"}
                    </p>
                    {/* Manual override for criteria without auto-validation */}
                    {!c.valide_auto && (
                      <div className="flex items-center gap-2 pt-1">
                        <Checkbox
                          checked={c.valide_manuellement}
                          onCheckedChange={(checked) => handleToggleCritereManuel(c.id, !!checked)}
                          disabled={!isAdmin}
                        />
                        <span className="text-xs text-muted-foreground">Critère validé manuellement</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="sous-taches" className="mt-4">
            {linkedSousTaches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune sous-tâche liée à cet extrant.</p>
            ) : (
              <div className="space-y-2">
                {linkedSousTaches.map((st: any) => (
                  <div key={st.id} className="p-3 border rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">{st.code}</Badge>
                        <span className="text-sm text-foreground truncate">{st.libelle}</span>
                      </div>
                      <Badge className={st.avancement === 100 ? "bg-success/20 text-success-foreground" : "bg-muted text-muted-foreground"}>
                        {st.avancement}%
                      </Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div className="bg-primary h-1.5 rounded-full" style={{ width: `${st.avancement}%` }} />
                    </div>
                    {st.criteresLies.length > 0 && (
                      <p className="text-xs text-muted-foreground">Critères : {st.criteresLies.join(", ")}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default ExtrantDetailPanel;
