import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Save, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  calculateNoteRealisation, calculateCompScores, calculateNoteGlobale, getAppreciation, suggestNote,
} from "@/lib/evaluationUtils";

interface Props {
  agentId: string;
  exerciceId: string;
  open: boolean;
  onClose: () => void;
}

const compFields = [
  { key: "comp_assiduite", label: "Assiduité et ponctualité", group: "comportement" },
  { key: "comp_responsabilite", label: "Sens des responsabilités", group: "comportement" },
  { key: "comp_communication", label: "Communication", group: "comportement" },
  { key: "comp_quantite_travail", label: "Quantité de travail", group: "performance" },
  { key: "comp_qualite_travail", label: "Qualité du travail", group: "performance" },
  { key: "comp_esprit_critique", label: "Esprit critique et jugement", group: "performance" },
  { key: "comp_organisation", label: "Organisation", group: "pro" },
  { key: "comp_actualisation", label: "Actualisation des compétences", group: "pro" },
  { key: "comp_initiative", label: "Initiative", group: "pro" },
  { key: "comp_discretion", label: "Discrétion", group: "pro" },
  { key: "comp_habiletes", label: "Habiletés physiques", group: "pro" },
] as const;

type FormData = Record<string, any>;

const EvaluationFormPanel = ({ agentId, exerciceId, open, onClose }: Props) => {
  const { toast } = useToast();
  const [form, setForm] = useState<FormData>({});
  const [objectiveNotes, setObjectiveNotes] = useState<Record<string, number>>({});

  const { data: evaluation } = useQuery({
    queryKey: ["evaluation-detail", agentId, exerciceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("evaluations_agents")
        .select("*")
        .eq("agent_id", agentId)
        .eq("exercice_id", exerciceId)
        .maybeSingle();
      return data;
    },
  });

  const { data: assignations = [] } = useQuery({
    queryKey: ["agent-assigns-eval", agentId, exerciceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("assignations_sous_taches")
        .select("*")
        .eq("agent_id", agentId)
        .eq("exercice_id", exerciceId);
      return data ?? [];
    },
  });

  const { data: sousTaches = [] } = useQuery({
    queryKey: ["st-eval-detail"],
    queryFn: async () => {
      const { data } = await supabase.from("sous_taches").select("id, code, libelle");
      return data ?? [];
    },
  });

  const { data: executions = [] } = useQuery({
    queryKey: ["exec-eval", exerciceId],
    queryFn: async () => {
      const { data } = await supabase.from("executions").select("*").eq("exercice_id", exerciceId);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (evaluation) {
      setForm(evaluation);
    } else {
      setForm({ statut: "brouillon" });
    }
  }, [evaluation]);

  useEffect(() => {
    // Set suggested notes for objectives
    const notes: Record<string, number> = {};
    assignations.forEach(a => {
      const exec = executions.find(e => e.sous_tache_id === a.sous_tache_id);
      notes[a.id] = suggestNote(exec?.avancement_pct ?? 0);
    });
    setObjectiveNotes(prev => ({ ...notes, ...prev }));
  }, [assignations, executions]);

  const noteReal = useMemo(() => {
    const objectives = assignations.map(a => ({
      note: objectiveNotes[a.id] ?? 0,
      poids: Number(a.poids_objectif),
    }));
    return calculateNoteRealisation(objectives);
  }, [assignations, objectiveNotes]);

  const compScores = useMemo(() => calculateCompScores({
    assiduite: form.comp_assiduite,
    responsabilite: form.comp_responsabilite,
    communication: form.comp_communication,
    quantite_travail: form.comp_quantite_travail,
    qualite_travail: form.comp_qualite_travail,
    esprit_critique: form.comp_esprit_critique,
    organisation: form.comp_organisation,
    actualisation: form.comp_actualisation,
    initiative: form.comp_initiative,
    discretion: form.comp_discretion,
    habiletes: form.comp_habiletes,
  }), [form]);

  const noteGlobale = useMemo(
    () => calculateNoteGlobale(noteReal, compScores.noteComp, compScores.notePerf),
    [noteReal, compScores]
  );

  const appreciation = getAppreciation(noteGlobale);

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  const handleSave = async (finalize = false) => {
    const payload = {
      agent_id: agentId,
      exercice_id: exerciceId,
      ...form,
      note_realisation: noteReal,
      note_comp_comportement: compScores.noteComp,
      note_comp_performance: compScores.notePerf,
      note_comp_pro: compScores.notePro,
      note_globale: noteGlobale,
      appreciation_globale: appreciation,
      statut: finalize ? "finalise" : "en_evaluation",
      date_evaluation: finalize ? new Date().toISOString().split("T")[0] : form.date_evaluation,
    };

    // Remove read-only fields
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;

    let error;
    if (evaluation) {
      ({ error } = await supabase.from("evaluations_agents").update(payload).eq("id", evaluation.id));
    } else {
      ({ error } = await supabase.from("evaluations_agents").insert(payload));
    }

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: finalize ? "✅ Évaluation finalisée" : "💾 Brouillon enregistré" });
      onClose();
    }
  };

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>⭐ Évaluation annuelle</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-4">
          {/* Section: Objectives results */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">1. Résultats des objectifs</h3>
            <div className="space-y-2">
              {assignations.map(a => {
                const st = sousTaches.find(s => s.id === a.sous_tache_id);
                const exec = executions.find(e => e.sous_tache_id === a.sous_tache_id);
                return (
                  <div key={a.id} className="border rounded-lg p-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{st?.code} — {st?.libelle}</span>
                      <span className="text-muted-foreground">Poids: {Number(a.poids_objectif)}%</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span>Avancement: <strong>{exec?.avancement_pct ?? 0}%</strong></span>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Note /10:</Label>
                        <Input
                          type="number" min={0} max={10} step={0.5}
                          className="w-20 h-8 text-sm"
                          value={objectiveNotes[a.id] ?? ""}
                          onChange={e => setObjectiveNotes(prev => ({ ...prev, [a.id]: Number(e.target.value) }))}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="text-sm font-bold text-right">
                Note réalisation: {noteReal.toFixed(2)} / 10
              </div>
            </div>
          </div>

          <Separator />

          {/* Section: Missions */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">2. Missions du poste</h3>
            {["responsabilite_r1", "responsabilite_r2", "responsabilite_r3", "responsabilite_r4", "responsabilite_r5"].map((key, i) => (
              <div key={key} className="space-y-1 mb-2">
                <Label className="text-xs">R{i + 1}</Label>
                <Input value={form[key] ?? ""} onChange={e => set(key, e.target.value)} className="h-8 text-sm" />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-xs">Modifications des tâches</Label>
              <Textarea value={form.modifications_taches ?? ""} onChange={e => set("modifications_taches", e.target.value)} className="text-sm" rows={2} />
            </div>
          </div>

          <Separator />

          {/* Section: Competences */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">4. Compétences</h3>
            {["comportement", "performance", "pro"].map(group => (
              <div key={group} className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase">
                  {group === "comportement" ? "Comportementales" : group === "performance" ? "Liées à la performance" : "Professionnelles"}
                </p>
                {compFields.filter(f => f.group === group).map(f => (
                  <div key={f.key} className="flex items-center justify-between py-1">
                    <span className="text-sm">{f.label}</span>
                    <Select value={String(form[f.key] ?? "")} onValueChange={v => set(f.key, Number(v))}>
                      <SelectTrigger className="w-20 h-8"><SelectValue placeholder="/5" /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map(n => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <Separator />

          {/* Section: Global score */}
          <div className="rounded-lg border p-4 space-y-2" style={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}>
            <h3 className="text-sm font-semibold">5. Note globale</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span>Réalisation des objectifs:</span><span className="font-bold">{noteReal.toFixed(2)} / 10</span>
              <span>Comp. comportementales:</span><span className="font-bold">{compScores.noteComp.toFixed(2)} / 5</span>
              <span>Comp. performance:</span><span className="font-bold">{compScores.notePerf.toFixed(2)} / 5</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>NOTE GLOBALE:</span>
              <span style={{ color: "hsl(var(--primary))" }}>{noteGlobale.toFixed(2)} / 20</span>
            </div>
            <p className="text-xs italic text-muted-foreground">{appreciation}</p>
          </div>

          <Separator />

          {/* Section: Points forts / à améliorer */}
          <div className="space-y-2">
            <Label className="text-sm">Points forts</Label>
            <Textarea value={form.points_forts ?? ""} onChange={e => set("points_forts", e.target.value)} rows={2} className="text-sm" />
            <Label className="text-sm">Points à améliorer</Label>
            <Textarea value={form.points_ameliorer ?? ""} onChange={e => set("points_ameliorer", e.target.value)} rows={2} className="text-sm" />
          </div>

          {/* Section: Comments */}
          <div className="space-y-2">
            <Label className="text-sm">Commentaire de l'agent</Label>
            <Textarea value={form.commentaire_agent ?? ""} onChange={e => set("commentaire_agent", e.target.value)} rows={2} className="text-sm" />
            <Label className="text-sm">Commentaire de l'évaluateur</Label>
            <Textarea value={form.commentaire_evaluateur ?? ""} onChange={e => set("commentaire_evaluateur", e.target.value)} rows={2} className="text-sm" />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => handleSave(false)}>
              <Save className="h-3.5 w-3.5 mr-1" /> Enregistrer brouillon
            </Button>
            <Button onClick={() => handleSave(true)}>
              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Finaliser
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EvaluationFormPanel;
