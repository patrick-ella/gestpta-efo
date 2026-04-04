import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import type { ActiviteWithExtrants } from "@/hooks/useExtrantsData";

interface CritereForm {
  libelle: string;
  type_critere: string;
  date_echeance: string;
  seuil_valeur: string;
  seuil_unite: string;
  linkedSousTaches: { sous_tache_id: string; condition_type: string; condition_seuil: string }[];
}

interface Props {
  activiteId: string;
  activites: ActiviteWithExtrants[];
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const ExtrantWizard = ({ activiteId, activites, open, onClose, onCreated }: Props) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [reference, setReference] = useState("");
  const [libelle, setLibelle] = useState("");
  const [indicateur, setIndicateur] = useState("");
  const [criteres, setCriteres] = useState<CritereForm[]>([]);

  const activite = activites.find((a) => a.id === activiteId);
  const existingRefs = activite?.extrants.map((e) => e.reference) ?? [];

  // Fetch sous-tâches for this activité
  const { data: sousTaches = [] } = useQuery({
    queryKey: ["wizard-sous-taches", activiteId],
    queryFn: async () => {
      const { data: taches } = await supabase.from("taches").select("id").eq("activite_id", activiteId);
      if (!taches?.length) return [];
      const { data: sts } = await supabase.from("sous_taches").select("id, code, libelle").in("tache_id", taches.map((t: any) => t.id)).order("code");
      return sts ?? [];
    },
    enabled: !!activiteId,
  });

  const addCritere = () => {
    setCriteres((prev) => [...prev, { libelle: "", type_critere: "binaire", date_echeance: "", seuil_valeur: "", seuil_unite: "", linkedSousTaches: [] }]);
  };

  const updateCritere = (idx: number, field: string, value: string) => {
    setCriteres((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  const removeCritere = (idx: number) => {
    setCriteres((prev) => prev.filter((_, i) => i !== idx));
  };

  const addLink = (critIdx: number) => {
    setCriteres((prev) =>
      prev.map((c, i) =>
        i === critIdx ? { ...c, linkedSousTaches: [...c.linkedSousTaches, { sous_tache_id: "", condition_type: "avancement_100", condition_seuil: "" }] } : c
      )
    );
  };

  const updateLink = (critIdx: number, linkIdx: number, field: string, value: string) => {
    setCriteres((prev) =>
      prev.map((c, i) =>
        i === critIdx
          ? { ...c, linkedSousTaches: c.linkedSousTaches.map((l, j) => (j === linkIdx ? { ...l, [field]: value } : l)) }
          : c
      )
    );
  };

  const removeLink = (critIdx: number, linkIdx: number) => {
    setCriteres((prev) =>
      prev.map((c, i) =>
        i === critIdx ? { ...c, linkedSousTaches: c.linkedSousTaches.filter((_, j) => j !== linkIdx) } : c
      )
    );
  };

  const canProceedStep1 = reference.trim() && libelle.trim() && indicateur.trim() && !existingRefs.includes(reference.trim());
  const canProceedStep2 = criteres.length === 0 || criteres.every((c) => c.libelle.trim());

  const handleCreate = async () => {
    try {
      // 1. Insert extrant
      const { data: ext, error: extErr } = await supabase.from("extrants").insert({
        activite_id: activiteId,
        reference: reference.trim(),
        libelle: libelle.trim(),
        indicateur_mesure: indicateur.trim(),
        ordre: (activite?.extrants.length ?? 0) + 1,
        updated_by: user?.id,
      }).select("id").single();

      if (extErr) throw extErr;

      // 2. Insert criteres
      for (let i = 0; i < criteres.length; i++) {
        const c = criteres[i];
        const { data: crit, error: critErr } = await supabase.from("extrants_criteres").insert({
          extrant_id: ext.id,
          libelle: c.libelle.trim(),
          type_critere: c.type_critere,
          date_echeance: c.date_echeance || null,
          seuil_valeur: c.seuil_valeur ? parseFloat(c.seuil_valeur) : null,
          seuil_unite: c.seuil_unite || null,
          ordre: i + 1,
        }).select("id").single();

        if (critErr) throw critErr;

        // 3. Insert links
        for (const link of c.linkedSousTaches) {
          if (!link.sous_tache_id) continue;
          await supabase.from("criteres_sous_taches").insert({
            critere_id: crit.id,
            sous_tache_id: link.sous_tache_id,
            condition_type: link.condition_type,
            condition_seuil: link.condition_seuil ? parseFloat(link.condition_seuil) : null,
          });
        }
      }

      // 4. Recalculate
      await supabase.rpc("recalculate_extrant_statut", { p_extrant_id: ext.id });

      toast.success(`✅ Extrant ${reference} créé avec succès`);
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>➕ Nouvel extrant — Étape {step}/3</DialogTitle>
          <p className="text-sm text-muted-foreground">Activité {activite?.code} — {activite?.libelle}</p>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Référence *</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="E33" />
              {existingRefs.includes(reference.trim()) && <p className="text-xs text-destructive">Cette référence existe déjà</p>}
            </div>
            <div className="space-y-1">
              <Label>Libellé de l'extrant *</Label>
              <Input value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Description de l'extrant..." />
            </div>
            <div className="space-y-1">
              <Label>Indicateur de mesure *</Label>
              <Textarea value={indicateur} onChange={(e) => setIndicateur(e.target.value)} placeholder="Décrivez les critères observables..." />
              <p className="text-xs text-muted-foreground">💡 Décrivez les critères observables permettant de mesurer la production de cet extrant</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Définissez les critères de validation issus de l'indicateur de mesure</p>
            {criteres.map((c, idx) => (
              <div key={idx} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Critère {idx + 1}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeCritere(idx)}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <Select value={c.type_critere} onValueChange={(v) => updateCritere(idx, "type_critere", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="binaire">Binaire (oui/non)</SelectItem>
                    <SelectItem value="date">Date (échéance)</SelectItem>
                    <SelectItem value="quantitatif">Quantitatif (seuil)</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={c.libelle} onChange={(e) => updateCritere(idx, "libelle", e.target.value)} placeholder="Libellé du critère..." />
                {c.type_critere === "date" && (
                  <Input type="date" value={c.date_echeance} onChange={(e) => updateCritere(idx, "date_echeance", e.target.value)} />
                )}
                {c.type_critere === "quantitatif" && (
                  <div className="flex gap-2">
                    <Input type="number" value={c.seuil_valeur} onChange={(e) => updateCritere(idx, "seuil_valeur", e.target.value)} placeholder="Seuil" />
                    <Input value={c.seuil_unite} onChange={(e) => updateCritere(idx, "seuil_unite", e.target.value)} placeholder="Unité (%)" />
                  </div>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addCritere}>+ Ajouter un critère</Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Associez chaque critère à la ou aux sous-tâches dont la réalisation le valide</p>
            {criteres.map((c, critIdx) => (
              <div key={critIdx} className="p-3 border rounded-lg space-y-2">
                <p className="text-sm font-medium">Critère {critIdx + 1} — "{c.libelle}"</p>
                {c.linkedSousTaches.map((link, linkIdx) => (
                  <div key={linkIdx} className="flex items-center gap-2">
                    <Select value={link.sous_tache_id} onValueChange={(v) => updateLink(critIdx, linkIdx, "sous_tache_id", v)}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Sous-tâche..." /></SelectTrigger>
                      <SelectContent>
                        {sousTaches.map((st: any) => (
                          <SelectItem key={st.id} value={st.id}>{st.code} — {st.libelle}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={link.condition_type} onValueChange={(v) => updateLink(critIdx, linkIdx, "condition_type", v)}>
                      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="avancement_100">Avancement = 100%</SelectItem>
                        <SelectItem value="avancement_seuil">Avancement ≥ seuil</SelectItem>
                        <SelectItem value="date_avant">Date avant échéance</SelectItem>
                        <SelectItem value="taux_budget">Taux budget ≥ seuil</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => removeLink(critIdx, linkIdx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => addLink(critIdx)}>🔍 Ajouter une sous-tâche</Button>
                {c.linkedSousTaches.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">ℹ️ Si aucune sous-tâche n'est liée, le critère restera en validation manuelle</p>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)}>← Précédent</Button>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}>
                Suivant →
              </Button>
            ) : (
              <Button onClick={handleCreate}>✅ Créer l'extrant</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExtrantWizard;
