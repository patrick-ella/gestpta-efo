import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Unlink, Plus, AlertTriangle, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ExtrantCritere } from "@/hooks/useExtrantsData";

interface Props {
  extrant: { id: string; activite_id: string } | null;
  activiteId: string | null;
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onUpdate: () => void;
  initialTab?: string;
}

const statutConfig: Record<string, { label: string; emoji: string; color: string }> = {
  non_produit: { label: "Non produit", emoji: "❌", color: "bg-muted text-muted-foreground" },
  en_cours: { label: "En cours", emoji: "⏳", color: "bg-warning/20 text-warning-foreground" },
  produit: { label: "Produit", emoji: "✅", color: "bg-success/20 text-success-foreground" },
  valide: { label: "Validé", emoji: "✔️", color: "bg-primary/20 text-primary" },
  rejete: { label: "Rejeté", emoji: "🔄", color: "bg-destructive/20 text-destructive" },
};

const conditionLabels: Record<string, string> = {
  avancement_100: "Avancement = 100%",
  avancement_seuil: "Avancement ≥ seuil",
  date_avant: "Date avant échéance",
  taux_budget: "Taux budget ≥ seuil",
};

const ExtrantDetailPanel = ({ extrant: extrantProp, activiteId, open, onClose, isAdmin, onUpdate, initialTab }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const extrantId = extrantProp?.id ?? null;

  const [rejectMotif, setRejectMotif] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab || "info");

  // Edit mode for Tab 1
  const [editMode, setEditMode] = useState(false);
  const [editRef, setEditRef] = useState("");
  const [editLibelle, setEditLibelle] = useState("");
  const [editIndicateur, setEditIndicateur] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmRef, setDeleteConfirmRef] = useState("");

  // Criteria editing
  const [editingCritereId, setEditingCritereId] = useState<string | null>(null);
  const [critereForm, setCritereForm] = useState({ libelle: "", type_critere: "binaire", date_echeance: "", seuil_valeur: "", seuil_unite: "" });
  const [addingCritere, setAddingCritere] = useState(false);
  const [deletingCritereId, setDeletingCritereId] = useState<string | null>(null);

  // Link editing
  const [addingLinkCritereId, setAddingLinkCritereId] = useState<string | null>(null);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkCondition, setLinkCondition] = useState("avancement_100");
  const [linkSeuil, setLinkSeuil] = useState("");
  const [selectedLinkSt, setSelectedLinkSt] = useState<string | null>(null);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editLinkCondition, setEditLinkCondition] = useState("");
  const [editLinkSeuil, setEditLinkSeuil] = useState("");
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  // ========== SELF-FETCHING QUERIES ==========

  // Fetch extrant detail
  const { data: extrant, isLoading: loadingExtrant } = useQuery({
    queryKey: ["extrant-detail", extrantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extrants")
        .select("*")
        .eq("id", extrantId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!extrantId && open,
    staleTime: 0,
  });

  // Fetch criteria
  const { data: criteres = [], isLoading: loadingCriteres } = useQuery({
    queryKey: ["extrant-criteres", extrantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extrants_criteres")
        .select("*")
        .eq("extrant_id", extrantId!)
        .order("ordre");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!extrantId && open,
    staleTime: 0,
  });

  // Fetch all sous-tâches for linking
  const { data: allSousTaches = [] } = useQuery({
    queryKey: ["all-sous-taches-for-link"],
    queryFn: async () => {
      const { data } = await supabase.from("sous_taches").select("id, code, libelle, tache_id").order("code");
      return data ?? [];
    },
    enabled: open,
  });

  // Fetch linked sous-tâches
  const { data: linkedSousTaches = [] } = useQuery({
    queryKey: ["extrant-linked-st", extrantId, criteres.map(c => c.id).join(",")],
    queryFn: async () => {
      if (!criteres.length) return [];
      const critereIds = criteres.map((c) => c.id);
      const { data: liens } = await supabase
        .from("criteres_sous_taches")
        .select("id, critere_id, sous_tache_id, condition_type, condition_seuil")
        .in("critere_id", critereIds);
      if (!liens?.length) return [];

      const stIds = [...new Set(liens.map((l: any) => l.sous_tache_id))];
      const [{ data: sts }, { data: execs }] = await Promise.all([
        supabase.from("sous_taches").select("id, code, libelle").in("id", stIds),
        supabase.from("executions").select("sous_tache_id, avancement_pct").in("sous_tache_id", stIds),
      ]);

      const execMap: Record<string, number> = {};
      (execs ?? []).forEach((e: any) => { execMap[e.sous_tache_id] = e.avancement_pct ?? 0; });

      return liens.map((l: any) => {
        const st = (sts ?? []).find((s: any) => s.id === l.sous_tache_id);
        return { ...l, code: st?.code ?? "", libelle: st?.libelle ?? "", avancement: execMap[l.sous_tache_id] ?? 0 };
      });
    },
    enabled: !!extrantId && criteres.length > 0 && open,
    staleTime: 0,
  });

  // ========== INVALIDATION HELPER ==========
  const invalidateAll = useCallback(() => {
    if (!extrantId) return;
    queryClient.invalidateQueries({ queryKey: ["extrant-detail", extrantId] });
    queryClient.invalidateQueries({ queryKey: ["extrant-criteres", extrantId] });
    queryClient.invalidateQueries({ queryKey: ["extrant-linked-st", extrantId] });
    queryClient.invalidateQueries({ queryKey: ["extrants-data"] });
    queryClient.invalidateQueries({ queryKey: ["extrants-stats"] });
    onUpdate();
  }, [extrantId, queryClient, onUpdate]);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Reset all modes when panel closes or extrant changes
  useEffect(() => {
    setEditMode(false);
    setShowReject(false);
    setShowDelete(false);
    setEditingCritereId(null);
    setAddingCritere(false);
    setAddingLinkCritereId(null);
    setEditingLinkId(null);
    setUnlinkingId(null);
    setDeletingCritereId(null);
    setDeleteConfirmRef("");
    setRejectMotif("");
  }, [extrantId, open]);

  const recalculate = useCallback(async () => {
    if (!extrantId) return;
    await supabase.rpc("recalculate_extrant_statut", { p_extrant_id: extrantId });
    invalidateAll();
  }, [extrantId, invalidateAll]);

  if (!extrantId || !open) return null;

  if (loadingExtrant || !extrant) {
    return (
      <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <SheetContent className="w-full sm:max-w-lg">
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Chargement...</span>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const st = statutConfig[extrant.statut] || statutConfig.non_produit;
  const totalCrit = criteres.length;
  const validCrit = criteres.filter((c) => c.valide_final).length;

  // === Tab 1 handlers ===
  const startEdit = () => {
    setEditRef(extrant.reference);
    setEditLibelle(extrant.libelle);
    setEditIndicateur(extrant.indicateur_mesure);
    setEditMode(true);
  };

  const hasChanges = editRef !== extrant.reference || editLibelle !== extrant.libelle || editIndicateur !== extrant.indicateur_mesure;

  const cancelEdit = () => {
    if (hasChanges && !confirm("Modifications non enregistrées. Quitter ?")) return;
    setEditMode(false);
  };

  const saveEdit = async () => {
    if (!editRef.trim() || editLibelle.trim().length < 5 || editIndicateur.trim().length < 10) {
      toast.error("Vérifiez les champs : référence requise, libellé ≥ 5 car., indicateur ≥ 10 car.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("extrants").update({
        reference: editRef.trim(),
        libelle: editLibelle.trim(),
        indicateur_mesure: editIndicateur.trim(),
        updated_by: user?.id,
      }).eq("id", extrant.id);
      if (error) throw error;
      await supabase.from("journal_audit").insert({
        user_id: user?.id ?? null, action: "UPDATE", entite: "extrant",
        ancienne_valeur: { reference: extrant.reference, libelle: extrant.libelle, indicateur_mesure: extrant.indicateur_mesure } as any,
        nouvelle_valeur: { reference: editRef.trim(), libelle: editLibelle.trim(), indicateur_mesure: editIndicateur.trim() } as any,
      });
      toast.success(`✅ Extrant ${editRef.trim()} mis à jour`);
      setEditMode(false);
      invalidateAll();
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // === Validate/Reject/Reset ===
  const handleValidate = async () => {
    await supabase.from("extrants").update({ statut: "valide", statut_mode: "manuel", date_validation: new Date().toISOString().split("T")[0], valide_par: user?.id }).eq("id", extrant.id);
    await supabase.from("journal_audit").insert({ user_id: user?.id ?? null, action: "VALIDATE", entite: "extrant", nouvelle_valeur: { reference: extrant.reference, statut: "valide" } as any });
    toast.success(`✔️ Extrant ${extrant.reference} validé`);
    invalidateAll();
  };

  const handleReject = async () => {
    if (!rejectMotif.trim()) return;
    await supabase.from("extrants").update({ statut: "rejete", statut_mode: "manuel", rejete_motif: rejectMotif }).eq("id", extrant.id);
    await supabase.from("journal_audit").insert({ user_id: user?.id ?? null, action: "REJECT", entite: "extrant", nouvelle_valeur: { reference: extrant.reference, statut: "rejete", motif: rejectMotif } as any });
    toast.success(`🔄 Extrant ${extrant.reference} rejeté`);
    invalidateAll();
    setShowReject(false);
  };

  const handleResetAuto = async () => {
    await supabase.from("extrants").update({ statut_mode: "auto" }).eq("id", extrant.id);
    await supabase.rpc("recalculate_extrant_statut", { p_extrant_id: extrant.id });
    invalidateAll();
    toast.success("Statut remis en calcul automatique");
  };

  // === Delete extrant ===
  const handleDelete = async () => {
    try {
      const critIds = criteres.map(c => c.id);
      if (critIds.length) {
        await supabase.from("criteres_sous_taches").delete().in("critere_id", critIds);
        await supabase.from("extrants_criteres").delete().eq("extrant_id", extrant.id);
      }
      await supabase.from("extrants").delete().eq("id", extrant.id);
      await supabase.from("journal_audit").insert({
        user_id: user?.id ?? null, action: "DELETE", entite: "extrant",
        ancienne_valeur: { reference: extrant.reference, libelle: extrant.libelle, statut: extrant.statut, nb_criteres: totalCrit } as any,
      });
      toast.success(`🗑 Extrant ${extrant.reference} supprimé`);
      invalidateAll();
      onClose();
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`);
    }
  };

  // === Criteria handlers ===
  const startEditCritere = (c: ExtrantCritere) => {
    setCritereForm({ libelle: c.libelle, type_critere: c.type_critere, date_echeance: c.date_echeance ?? "", seuil_valeur: c.seuil_valeur?.toString() ?? "", seuil_unite: c.seuil_unite ?? "" });
    setEditingCritereId(c.id);
  };

  const startAddCritere = () => {
    setCritereForm({ libelle: "", type_critere: "binaire", date_echeance: "", seuil_valeur: "", seuil_unite: "" });
    setAddingCritere(true);
  };

  const saveCritere = async (critereId?: string) => {
    if (!critereForm.libelle.trim()) { toast.error("Le libellé est requis"); return; }
    setSaving(true);
    try {
      const payload: any = {
        libelle: critereForm.libelle.trim(),
        type_critere: critereForm.type_critere,
        date_echeance: critereForm.type_critere === "date" && critereForm.date_echeance ? critereForm.date_echeance : null,
        seuil_valeur: critereForm.type_critere === "quantitatif" && critereForm.seuil_valeur ? parseFloat(critereForm.seuil_valeur) : null,
        seuil_unite: critereForm.type_critere === "quantitatif" ? critereForm.seuil_unite || null : null,
      };
      if (critereId) {
        await supabase.from("extrants_criteres").update(payload).eq("id", critereId);
        toast.success("✅ Critère mis à jour");
      } else {
        payload.extrant_id = extrant.id;
        payload.ordre = totalCrit + 1;
        await supabase.from("extrants_criteres").insert(payload);
        toast.success("✅ Critère ajouté");
      }
      await recalculate();
      setEditingCritereId(null);
      setAddingCritere(false);
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleDeleteCritere = async (critereId: string) => {
    await supabase.from("criteres_sous_taches").delete().eq("critere_id", critereId);
    await supabase.from("extrants_criteres").delete().eq("id", critereId);
    await recalculate();
    setDeletingCritereId(null);
    toast.success("🗑 Critère supprimé");
  };

  const handleToggleCritereManuel = async (critereId: string, checked: boolean) => {
    await supabase.from("extrants_criteres").update({ valide_manuellement: checked }).eq("id", critereId);
    await recalculate();
  };

  // === Link handlers ===
  const addLink = async () => {
    if (!selectedLinkSt || !addingLinkCritereId) return;
    try {
      await supabase.from("criteres_sous_taches").insert({
        critere_id: addingLinkCritereId,
        sous_tache_id: selectedLinkSt,
        condition_type: linkCondition,
        condition_seuil: linkSeuil ? parseFloat(linkSeuil) : null,
      });
      await recalculate();
      setAddingLinkCritereId(null);
      setSelectedLinkSt(null);
      setLinkSearch("");
      toast.success("🔗 Sous-tâche liée au critère");
    } catch (err: any) { toast.error(err.message); }
  };

  const updateLink = async (linkId: string) => {
    await supabase.from("criteres_sous_taches").update({ condition_type: editLinkCondition, condition_seuil: editLinkSeuil ? parseFloat(editLinkSeuil) : null }).eq("id", linkId);
    await recalculate();
    setEditingLinkId(null);
    toast.success("✅ Condition mise à jour");
  };

  const removeLink = async (linkId: string) => {
    await supabase.from("criteres_sous_taches").delete().eq("id", linkId);
    await recalculate();
    setUnlinkingId(null);
    toast.success("🔗 Lien supprimé");
  };

  // Filter sous-tâches for search
  const existingLinkStIds = linkedSousTaches.filter((l: any) => l.critere_id === addingLinkCritereId).map((l: any) => l.sous_tache_id);
  const filteredSts = allSousTaches.filter((st: any) =>
    (st.code.includes(linkSearch) || st.libelle.toLowerCase().includes(linkSearch.toLowerCase()))
  );

  // Criteria form component
  const renderCritereForm = (critereId?: string) => (
    <div className="p-3 border rounded-lg space-y-2 bg-accent/10">
      <Select value={critereForm.type_critere} onValueChange={(v) => setCritereForm(p => ({ ...p, type_critere: v }))}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="binaire">Binaire (oui/non)</SelectItem>
          <SelectItem value="date">Date (échéance)</SelectItem>
          <SelectItem value="quantitatif">Quantitatif (seuil)</SelectItem>
        </SelectContent>
      </Select>
      <Input value={critereForm.libelle} onChange={(e) => setCritereForm(p => ({ ...p, libelle: e.target.value }))} placeholder="Libellé du critère..." />
      {critereForm.type_critere === "date" && (
        <Input type="date" value={critereForm.date_echeance} onChange={(e) => setCritereForm(p => ({ ...p, date_echeance: e.target.value }))} />
      )}
      {critereForm.type_critere === "quantitatif" && (
        <div className="flex gap-2">
          <Input type="number" value={critereForm.seuil_valeur} onChange={(e) => setCritereForm(p => ({ ...p, seuil_valeur: e.target.value }))} placeholder="Seuil" />
          <Input value={critereForm.seuil_unite} onChange={(e) => setCritereForm(p => ({ ...p, seuil_unite: e.target.value }))} placeholder="Unité (%)" />
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => saveCritere(critereId)} disabled={saving}>
          {saving ? "⏳ Enregistrement..." : "💾 Sauvegarder"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setEditingCritereId(null); setAddingCritere(false); }}>✕ Annuler</Button>
      </div>
    </div>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">{extrant.reference}</Badge>
                <span className="text-foreground truncate">{extrant.libelle}</span>
              </SheetTitle>
              {isAdmin && (
                <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => setShowDelete(true)} title="Supprimer">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="info">📋 Infos</TabsTrigger>
              <TabsTrigger value="criteres">✅ Critères</TabsTrigger>
              <TabsTrigger value="sous-taches">🔗 Liens</TabsTrigger>
            </TabsList>

            {/* ===================== TAB 1 — INFORMATIONS ===================== */}
            <TabsContent value="info" className="space-y-4 mt-4">
              {editMode ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">✏️ Modification — {extrant.reference}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Référence *</Label>
                    <Input value={editRef} onChange={(e) => setEditRef(e.target.value)} className="max-w-32" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between"><Label className="text-sm">Libellé *</Label><span className="text-xs text-muted-foreground">{editLibelle.length}/300</span></div>
                    <Textarea value={editLibelle} onChange={(e) => setEditLibelle(e.target.value.slice(0, 300))} rows={2} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between"><Label className="text-sm">Indicateur de mesure *</Label><span className="text-xs text-muted-foreground">{editIndicateur.length}/500</span></div>
                    <Textarea value={editIndicateur} onChange={(e) => setEditIndicateur(e.target.value.slice(0, 500))} rows={3} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={saveEdit} disabled={saving}>
                      {saving ? "⏳ Enregistrement..." : "💾 Enregistrer"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>✕ Annuler</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <div className="space-y-3 flex-1">
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
                    </div>
                    {isAdmin && (
                      <Button variant="ghost" size="sm" onClick={startEdit}><Pencil className="h-3.5 w-3.5 mr-1" /> Modifier</Button>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Statut actuel</Label>
                    <div className="flex items-center gap-2">
                      <Badge className={st.color}>{st.emoji} {st.label}</Badge>
                      {extrant.statut_mode === "manuel" && <span className="text-xs text-muted-foreground">(manuel)</span>}
                    </div>
                  </div>
                  {totalCrit > 0 && (
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">Critères validés</Label>
                      <p className="text-sm text-foreground">{validCrit}/{totalCrit}</p>
                    </div>
                  )}
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
                  {isAdmin && extrant.statut === "produit" && (
                    <div className="flex gap-2 pt-4 border-t">
                      <Button size="sm" onClick={handleValidate}>✔️ Valider</Button>
                      <Button size="sm" variant="destructive" onClick={() => setShowReject(true)}>🔄 Rejeter</Button>
                    </div>
                  )}
                  {isAdmin && showReject && (
                    <div className="space-y-2 p-3 border rounded-lg">
                      <Label className="text-sm">Motif de rejet *</Label>
                      <Textarea value={rejectMotif} onChange={(e) => setRejectMotif(e.target.value)} placeholder="Expliquez le motif..." />
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={handleReject} disabled={!rejectMotif.trim()}>Confirmer</Button>
                        <Button size="sm" variant="outline" onClick={() => setShowReject(false)}>Annuler</Button>
                      </div>
                    </div>
                  )}
                  {isAdmin && (extrant.statut === "valide" || extrant.statut === "rejete") && (
                    <Button size="sm" variant="outline" onClick={handleResetAuto} className="mt-2">↩️ Calcul automatique</Button>
                  )}
                </>
              )}
            </TabsContent>

            {/* ===================== TAB 2 — CRITÈRES ===================== */}
            <TabsContent value="criteres" className="space-y-3 mt-4">
              {loadingCriteres ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : totalCrit === 0 && !addingCritere ? (
                <div className="text-center py-6 space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">✅ Aucun critère défini</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Décomposez l'indicateur de mesure en critères élémentaires pour permettre le calcul automatique du statut.
                  </p>
                  <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground italic">
                    Indicateur : « {extrant.indicateur_mesure} »
                  </div>
                  {isAdmin && (
                    <Button variant="outline" size="sm" onClick={startAddCritere}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Définir les critères de validation
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {criteres.map((c) => {
                    const typeLabel = c.type_critere === "binaire" ? "Binaire" : c.type_critere === "date" ? "Date" : "Quantitatif";
                    if (editingCritereId === c.id) return <div key={c.id}>{renderCritereForm(c.id)}</div>;
                    return (
                      <div key={c.id} className="p-3 border rounded-lg space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-lg ${c.valide_final ? "text-success-foreground" : "text-muted-foreground"}`}>{c.valide_final ? "✅" : "❌"}</span>
                            <span className="text-sm font-medium text-foreground">{c.libelle}</span>
                            <Badge variant="outline" className="text-xs">{typeLabel}</Badge>
                          </div>
                          {isAdmin && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditCritere(c as any)}><Pencil className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingCritereId(c.id)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          )}
                        </div>
                        {c.type_critere === "date" && c.date_echeance && <p className="text-xs text-muted-foreground">Échéance : {c.date_echeance}</p>}
                        {c.type_critere === "quantitatif" && c.seuil_valeur != null && <p className="text-xs text-muted-foreground">Seuil : {c.seuil_valeur} {c.seuil_unite ?? ""}</p>}
                        <p className="text-xs text-muted-foreground">{c.valide_auto ? "✅ Validé auto" : c.valide_manuellement ? "✅ Validé manuellement" : "⏳ En attente"}</p>
                        {!c.valide_auto && (
                          <div className="flex items-center gap-2 pt-1">
                            <Checkbox checked={c.valide_manuellement ?? false} onCheckedChange={(checked) => handleToggleCritereManuel(c.id, !!checked)} disabled={!isAdmin} />
                            <span className="text-xs text-muted-foreground">Critère validé manuellement</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {addingCritere && renderCritereForm()}
                  {isAdmin && !addingCritere && (
                    <Button variant="outline" size="sm" onClick={startAddCritere} className="w-full">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter un critère
                    </Button>
                  )}
                </>
              )}
            </TabsContent>

            {/* ===================== TAB 3 — SOUS-TÂCHES LIÉES ===================== */}
            <TabsContent value="sous-taches" className="mt-4 space-y-4">
              {criteres.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Définissez d'abord des critères (onglet ✅) pour pouvoir lier des sous-tâches.</p>
              ) : (
                criteres.map((c) => {
                  const critLinks = linkedSousTaches.filter((l: any) => l.critere_id === c.id);
                  return (
                    <div key={c.id} className="space-y-2">
                      <p className="text-sm font-medium text-foreground border-b pb-1">Critère — « {c.libelle.substring(0, 50)}{c.libelle.length > 50 ? "..." : ""} »</p>
                      {critLinks.length === 0 && (
                        <div className="text-xs text-muted-foreground italic p-2 bg-muted/30 rounded">
                          ⚠️ Aucune sous-tâche liée — validation manuelle uniquement.
                        </div>
                      )}
                      {critLinks.map((link: any) => (
                        <div key={link.id} className="p-2 border rounded-lg space-y-1">
                          {editingLinkId === link.id ? (
                            <div className="space-y-2">
                              <Select value={editLinkCondition} onValueChange={setEditLinkCondition}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="avancement_100">Avancement = 100%</SelectItem>
                                  <SelectItem value="avancement_seuil">Avancement ≥ seuil</SelectItem>
                                  <SelectItem value="date_avant">Date avant échéance</SelectItem>
                                  <SelectItem value="taux_budget">Taux budget ≥ seuil</SelectItem>
                                </SelectContent>
                              </Select>
                              {(editLinkCondition === "avancement_seuil" || editLinkCondition === "taux_budget") && (
                                <Input type="number" value={editLinkSeuil} onChange={(e) => setEditLinkSeuil(e.target.value)} placeholder="Seuil %" className="max-w-32" />
                              )}
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => updateLink(link.id)}>💾</Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingLinkId(null)}>✕</Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono text-xs">{link.code}</Badge>
                                  <span className="text-xs text-foreground truncate">{link.libelle}</span>
                                </div>
                                <Badge className={link.avancement === 100 ? "bg-success/20 text-success-foreground" : "bg-muted text-muted-foreground"}>{link.avancement}%</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">Condition : {conditionLabels[link.condition_type] || link.condition_type}{link.condition_seuil ? ` (${link.condition_seuil})` : ""}</p>
                              {isAdmin && (
                                <div className="flex gap-2 pt-1">
                                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setEditingLinkId(link.id); setEditLinkCondition(link.condition_type); setEditLinkSeuil(link.condition_seuil?.toString() ?? ""); }}>
                                    <Pencil className="h-3 w-3 mr-1" /> Condition
                                  </Button>
                                  {unlinkingId === link.id ? (
                                    <div className="flex gap-1 items-center">
                                      <span className="text-xs text-muted-foreground">Délier ?</span>
                                      <Button variant="destructive" size="sm" className="h-6 text-xs" onClick={() => removeLink(link.id)}>Oui</Button>
                                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setUnlinkingId(null)}>Non</Button>
                                    </div>
                                  ) : (
                                    <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => setUnlinkingId(link.id)}>
                                      <Unlink className="h-3 w-3 mr-1" /> Délier
                                    </Button>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))}

                      {/* Add link UI */}
                      {isAdmin && addingLinkCritereId === c.id ? (
                        <div className="p-2 border rounded-lg space-y-2 bg-accent/10">
                          <Input value={linkSearch} onChange={(e) => setLinkSearch(e.target.value)} placeholder="🔍 Rechercher une sous-tâche..." />
                          {linkSearch && (
                            <div className="max-h-32 overflow-y-auto border rounded space-y-0.5">
                              {filteredSts.slice(0, 10).map((st: any) => {
                                const alreadyLinked = existingLinkStIds.includes(st.id);
                                return (
                                  <div
                                    key={st.id}
                                    className={`px-2 py-1 text-xs cursor-pointer rounded ${selectedLinkSt === st.id ? "bg-primary/20" : alreadyLinked ? "opacity-40 cursor-not-allowed" : "hover:bg-accent/30"}`}
                                    onClick={() => !alreadyLinked && setSelectedLinkSt(st.id)}
                                  >
                                    <span className="font-mono">{st.code}</span> — {(st.libelle as string).substring(0, 45)}{alreadyLinked ? " (déjà liée)" : ""}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <Select value={linkCondition} onValueChange={setLinkCondition}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="avancement_100">Avancement = 100%</SelectItem>
                              <SelectItem value="avancement_seuil">Avancement ≥ seuil</SelectItem>
                              <SelectItem value="date_avant">Date avant échéance</SelectItem>
                              <SelectItem value="taux_budget">Taux budget ≥ seuil</SelectItem>
                            </SelectContent>
                          </Select>
                          {(linkCondition === "avancement_seuil" || linkCondition === "taux_budget") && (
                            <Input type="number" value={linkSeuil} onChange={(e) => setLinkSeuil(e.target.value)} placeholder="Seuil %" className="max-w-32" />
                          )}
                          <div className="flex gap-2">
                            <Button size="sm" onClick={addLink} disabled={!selectedLinkSt}>🔗 Lier</Button>
                            <Button size="sm" variant="outline" onClick={() => { setAddingLinkCritereId(null); setLinkSearch(""); setSelectedLinkSt(null); }}>Annuler</Button>
                          </div>
                        </div>
                      ) : isAdmin ? (
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setAddingLinkCritereId(c.id); setLinkSearch(""); setSelectedLinkSt(null); setLinkCondition("avancement_100"); setLinkSeuil(""); }}>
                          <Plus className="h-3 w-3 mr-1" /> Lier une sous-tâche
                        </Button>
                      ) : null}
                    </div>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      {showDelete && extrant && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowDelete(false)}>
          <div className="bg-background rounded-lg border shadow-lg max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground">🗑 Supprimer l'extrant</h3>
            <p className="text-sm text-muted-foreground">Vous êtes sur le point de supprimer :</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">{extrant.reference}</Badge>
              <span className="text-sm text-foreground">{extrant.libelle}</span>
            </div>
            <div className="p-3 border rounded-lg bg-destructive/5 space-y-1">
              <p className="text-sm font-medium text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Cette action supprimera également :</p>
              <ul className="text-xs text-muted-foreground list-disc ml-5">
                <li>{totalCrit} critère(s) de validation</li>
                <li>{linkedSousTaches.length} lien(s) avec des sous-tâches</li>
              </ul>
              <p className="text-xs font-semibold text-destructive">Cette action est IRRÉVERSIBLE.</p>
            </div>
            {extrant.statut === "valide" && (
              <div className="p-3 border-2 border-destructive rounded-lg bg-destructive/10 space-y-1">
                <p className="text-sm font-bold text-destructive">🔴 ATTENTION — Extrant déjà validé</p>
                <p className="text-xs text-muted-foreground">Cet extrant a été validé{extrant.date_validation ? ` le ${extrant.date_validation}` : ""}. Sa suppression est fortement déconseillée.</p>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-sm">Pour confirmer, saisissez <span className="font-mono font-bold">{extrant.reference}</span> :</Label>
              <Input value={deleteConfirmRef} onChange={(e) => setDeleteConfirmRef(e.target.value)} placeholder={extrant.reference} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowDelete(false); setDeleteConfirmRef(""); }}>Annuler</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteConfirmRef !== extrant.reference}>🗑 Supprimer définitivement</Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete critere */}
      <ConfirmDialog
        open={!!deletingCritereId}
        onOpenChange={(v) => { if (!v) setDeletingCritereId(null); }}
        title="Supprimer ce critère ?"
        description="Les liens avec les sous-tâches associées seront également supprimés."
        onConfirm={() => deletingCritereId && handleDeleteCritere(deletingCritereId)}
      />
    </>
  );
};

export default ExtrantDetailPanel;
