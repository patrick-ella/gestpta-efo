import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LivrableFormModal } from "./LivrableFormModal";
import {
  Package, Plus, Paperclip, Trash2, Download, FileText,
  BarChart3, Handshake, Wrench, GraduationCap, PackageOpen, Loader2,
} from "lucide-react";
import { useSousTacheLivrables, type SousTacheLivrable } from "@/hooks/useSousTacheLivrables";
import { useUserRoles } from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STATUT_CONFIG: Record<string, { label: string; bg: string; border: string; badgeClass: string }> = {
  non_produit: { label: "Non produit", bg: "bg-background", border: "border-l-4 border-l-muted", badgeClass: "bg-muted text-muted-foreground" },
  en_cours: { label: "En cours", bg: "bg-amber-50", border: "border-l-4 border-l-amber-500", badgeClass: "bg-amber-100 text-amber-800" },
  produit: { label: "Produit", bg: "bg-green-50", border: "border-l-4 border-l-green-500", badgeClass: "bg-green-100 text-green-800" },
  valide: { label: "Validé", bg: "bg-blue-50", border: "border-l-4 border-l-blue-500", badgeClass: "bg-blue-100 text-blue-800" },
  rejete: { label: "Rejeté", bg: "bg-red-50", border: "border-l-4 border-l-red-500", badgeClass: "bg-red-100 text-red-800" },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  document: <FileText className="h-4 w-4" />,
  donnee: <BarChart3 className="h-4 w-4" />,
  convention: <Handshake className="h-4 w-4" />,
  equipement: <Wrench className="h-4 w-4" />,
  formation: <GraduationCap className="h-4 w-4" />,
  autre: <PackageOpen className="h-4 w-4" />,
};

interface Props {
  sousTacheId: string;
  tacheId: string;
  tacheLivrables?: string | null; // text from taches.livrables
}

export const SousTacheLivrablesTab = ({ sousTacheId, tacheId, tacheLivrables }: Props) => {
  const { data: livrables = [], isLoading, createLivrable, updateLivrable, deleteLivrable, uploadFile } = useSousTacheLivrables(sousTacheId);
  const { data: roles = [] } = useUserRoles();

  const isAdmin = roles.includes("super_admin") || roles.includes("admin_pta");
  const canEdit = isAdmin || roles.includes("responsable_activite") || roles.includes("agent_saisie");
  const canValidate = isAdmin;
  const canDelete = isAdmin;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingLivrable, setEditingLivrable] = useState<SousTacheLivrable | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SousTacheLivrable | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectMotif, setRejectMotif] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileTargetId, setFileTargetId] = useState<string | null>(null);

  const handleSave = async (data: { libelle: string; type_livrable: string; statut: string; date_echeance: string | null; commentaire: string | null; file?: File }) => {
    setIsSaving(true);
    try {
      let fichier_url: string | null = null;
      let fichier_nom: string | null = null;
      let fichier_taille: number | null = null;

      if (data.file) {
        const res = await uploadFile(data.file, editingLivrable?.id ?? "new");
        fichier_url = res.url;
        fichier_nom = res.name;
        fichier_taille = res.size;
      }

      if (editingLivrable) {
        await updateLivrable.mutateAsync({
          id: editingLivrable.id,
          libelle: data.libelle,
          type_livrable: data.type_livrable,
          statut: data.statut,
          date_echeance: data.date_echeance,
          commentaire: data.commentaire,
          ...(fichier_url ? { fichier_url, fichier_nom, fichier_taille } : {}),
          produit: data.statut === "produit" || data.statut === "valide",
          date_production: data.statut === "produit" ? new Date().toISOString().split("T")[0] : editingLivrable.date_production,
        });
      } else {
        await createLivrable.mutateAsync({
          sous_tache_id: sousTacheId,
          tache_id: tacheId,
          libelle: data.libelle,
          type_livrable: data.type_livrable,
          statut: data.statut,
          date_echeance: data.date_echeance,
          commentaire: data.commentaire,
          ...(fichier_url ? { fichier_url, fichier_nom, fichier_taille } : {}),
        });
      }
      setModalOpen(false);
      setEditingLivrable(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickStatus = async (livrable: SousTacheLivrable, newStatut: string) => {
    if (newStatut === "valide" && !canValidate) return;
    if (newStatut === "rejete") {
      setRejectTarget(livrable.id);
      setRejectMotif("");
      return;
    }

    const updates: any = { id: livrable.id, statut: newStatut };
    if (newStatut === "produit" && !livrable.date_production) {
      updates.date_production = new Date().toISOString().split("T")[0];
      updates.produit = true;
    }
    if (newStatut === "non_produit") {
      updates.produit = false;
    }
    if (newStatut === "en_cours") {
      updates.produit = false;
    }
    if (newStatut === "valide") {
      updates.produit = true;
    }
    await updateLivrable.mutateAsync(updates);
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget || !rejectMotif.trim()) {
      toast.error("Le motif du rejet est obligatoire");
      return;
    }
    await updateLivrable.mutateAsync({
      id: rejectTarget,
      statut: "rejete",
      commentaire: rejectMotif.trim(),
      produit: false,
    });
    setRejectTarget(null);
  };

  const handleFileUpload = (livrableId: string) => {
    setFileTargetId(livrableId);
    fileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fileTargetId) return;
    if (file.size > 50 * 1024 * 1024) { toast.error("Fichier trop volumineux (max 50 Mo)"); return; }
    setUploadingId(fileTargetId);
    try {
      const res = await uploadFile(file, fileTargetId);
      await updateLivrable.mutateAsync({
        id: fileTargetId,
        fichier_url: res.url,
        fichier_nom: res.name,
        fichier_taille: res.size,
      });
    } finally {
      setUploadingId(null);
      setFileTargetId(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleImport = async () => {
    if (!tacheLivrables) return;
    const items = tacheLivrables.split("\n").map((s) => s.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
    if (items.length === 0) return;

    for (const item of items) {
      await createLivrable.mutateAsync({
        sous_tache_id: sousTacheId,
        tache_id: tacheId,
        libelle: item,
        type_livrable: "document",
        statut: "non_produit",
      });
    }
    toast.success(`${items.length} livrables importés avec succès ✅`);
  };

  const produits = livrables.filter((l) => l.statut === "produit" || l.statut === "valide").length;
  const enCours = livrables.filter((l) => l.statut === "en_cours").length;
  const nonProduits = livrables.filter((l) => l.statut === "non_produit" || l.statut === "rejete").length;

  if (isLoading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" className="hidden" accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png,.svg" onChange={handleFileChange} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Livrables de la sous-tâche</h4>
          <p className="text-xs text-muted-foreground italic">Renseignez les livrables attendus et leur état de production</p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => { setEditingLivrable(null); setModalOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter un livrable
          </Button>
        )}
      </div>

      {/* Import from tache */}
      {livrables.length === 0 && tacheLivrables && canEdit && (
        <Button variant="outline" size="sm" className="w-full" onClick={handleImport}>
          📥 Importer les livrables définis pour cette tâche
        </Button>
      )}

      {/* Empty state */}
      {livrables.length === 0 && (
        <div className="text-center py-8 space-y-2">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Aucun livrable défini pour cette sous-tâche</p>
          <p className="text-xs text-muted-foreground">Cliquez sur '+ Ajouter un livrable' pour commencer</p>
        </div>
      )}

      {/* Livrable cards */}
      {livrables.map((l) => {
        const cfg = STATUT_CONFIG[l.statut ?? "non_produit"] ?? STATUT_CONFIG.non_produit;
        return (
          <div key={l.id} className={`rounded-lg p-3 space-y-2 ${cfg.bg} ${cfg.border}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground">{TYPE_ICONS[l.type_livrable ?? "document"]}</span>
                <span
                  className="text-sm font-medium text-foreground truncate cursor-pointer hover:underline"
                  onClick={() => { if (canEdit) { setEditingLivrable(l); setModalOpen(true); } }}
                >
                  {l.libelle}
                </span>
              </div>
              <Badge className={`text-xs shrink-0 ${cfg.badgeClass}`}>{cfg.label}</Badge>
            </div>

            {l.date_echeance && (
              <p className="text-xs text-muted-foreground">
                Échéance : {new Date(l.date_echeance).toLocaleDateString("fr-FR")}
              </p>
            )}

            {/* Quick status radio */}
            {canEdit && (
              <RadioGroup
                value={l.statut ?? "non_produit"}
                onValueChange={(v) => handleQuickStatus(l, v)}
                className="flex flex-wrap gap-3"
              >
                {["non_produit", "en_cours", "produit"].map((s) => (
                  <div key={s} className="flex items-center gap-1">
                    <RadioGroupItem value={s} id={`${l.id}-${s}`} />
                    <Label htmlFor={`${l.id}-${s}`} className="text-xs font-normal cursor-pointer">
                      {STATUT_CONFIG[s].label}
                    </Label>
                  </div>
                ))}
                {canValidate && (
                  <>
                    <div className="flex items-center gap-1">
                      <RadioGroupItem value="valide" id={`${l.id}-valide`} />
                      <Label htmlFor={`${l.id}-valide`} className="text-xs font-normal cursor-pointer">Validé</Label>
                    </div>
                    <div className="flex items-center gap-1">
                      <RadioGroupItem value="rejete" id={`${l.id}-rejete`} />
                      <Label htmlFor={`${l.id}-rejete`} className="text-xs font-normal cursor-pointer">Rejeté</Label>
                    </div>
                  </>
                )}
              </RadioGroup>
            )}

            {/* Reject motif inline */}
            {rejectTarget === l.id && (
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Motif du rejet (obligatoire)</Label>
                  <Input value={rejectMotif} onChange={(e) => setRejectMotif(e.target.value)} placeholder="Raison du rejet..." className="text-xs" />
                </div>
                <Button size="sm" onClick={handleRejectConfirm}>Confirmer</Button>
                <Button size="sm" variant="outline" onClick={() => setRejectTarget(null)}>Annuler</Button>
              </div>
            )}

            {/* File + actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {canEdit && (
                <Button variant="outline" size="sm" className="text-xs" onClick={() => handleFileUpload(l.id)} disabled={uploadingId === l.id}>
                  {uploadingId === l.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Paperclip className="h-3 w-3 mr-1" />}
                  Joindre
                </Button>
              )}
              {l.fichier_url && (
                <Button variant="outline" size="sm" className="text-xs" asChild>
                  <a href={l.fichier_url} target="_blank" rel="noopener noreferrer">
                    <Download className="h-3 w-3 mr-1" />
                    {l.fichier_nom ?? "Fichier"}
                  </a>
                </Button>
              )}
              {canDelete && (
                <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={() => setDeleteTarget(l)}>
                  <Trash2 className="h-3 w-3 mr-1" /> Supprimer
                </Button>
              )}
            </div>

            {l.commentaire && (
              <p className="text-xs text-muted-foreground italic">💬 {l.commentaire}</p>
            )}
          </div>
        );
      })}

      {/* Summary */}
      {livrables.length > 0 && (
        <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
          <span>Total : {livrables.length}</span>
          <span>✅ Produits : {produits}</span>
          <span>⏳ En cours : {enCours}</span>
          <span>❌ Non produits : {nonProduits}</span>
        </div>
      )}

      {/* Modal */}
      <LivrableFormModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditingLivrable(null); }}
        livrable={editingLivrable}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Supprimer ce livrable ?"
        description={`"${deleteTarget?.libelle ?? ""}" — Cette action est irréversible. Le fichier joint sera également supprimé.`}
        onConfirm={() => {
          if (deleteTarget) {
            deleteLivrable.mutate({ id: deleteTarget.id, fichierUrl: deleteTarget.fichier_url });
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
};
