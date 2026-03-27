import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Paperclip, Loader2, Save } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { SousTacheLivrable } from "@/hooks/useSousTacheLivrables";

const TYPE_OPTIONS = [
  { value: "document", label: "📄 Document", desc: "Rapport, plan, manuel" },
  { value: "donnee", label: "📊 Données", desc: "Statistiques" },
  { value: "convention", label: "🤝 Convention", desc: "Accord signé" },
  { value: "equipement", label: "🔧 Équipement", desc: "Matériel" },
  { value: "formation", label: "🎓 Attestation", desc: "Diplôme" },
  { value: "autre", label: "📦 Autre", desc: "" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  livrable?: SousTacheLivrable | null;
  onSave: (data: {
    libelle: string;
    type_livrable: string;
    statut: string;
    date_echeance: string | null;
    commentaire: string | null;
    file?: File;
  }) => Promise<void>;
  isSaving: boolean;
}

export const LivrableFormModal = ({ open, onOpenChange, livrable, onSave, isSaving }: Props) => {
  const [libelle, setLibelle] = useState(livrable?.libelle ?? "");
  const [type, setType] = useState(livrable?.type_livrable ?? "document");
  const [statut, setStatut] = useState(livrable?.statut ?? "non_produit");
  const [echeance, setEcheance] = useState<Date | undefined>(
    livrable?.date_echeance ? new Date(livrable.date_echeance) : undefined
  );
  const [commentaire, setCommentaire] = useState(livrable?.commentaire ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!libelle.trim() || libelle.trim().length < 3) errs.libelle = "Min 3 caractères requis";
    if (libelle.length > 200) errs.libelle = "Max 200 caractères";
    if (!type) errs.type = "Type requis";
    if (echeance && echeance < new Date(new Date().toDateString())) errs.echeance = "La date doit être >= aujourd'hui";
    if (file && file.size > 50 * 1024 * 1024) errs.file = "Fichier trop volumineux (max 50 Mo)";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSave({
      libelle: libelle.trim(),
      type_livrable: type,
      statut,
      date_echeance: echeance ? echeance.toISOString().split("T")[0] : null,
      commentaire: commentaire.trim() || null,
      file: file ?? undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{livrable ? "Modifier le livrable" : "Nouveau livrable"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Libellé */}
          <div className="space-y-1">
            <Label>Libellé du livrable *</Label>
            <Input
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="ex: Rapport mensuel validé"
            />
            {errors.libelle && <p className="text-xs text-destructive">{errors.libelle}</p>}
          </div>

          {/* Type */}
          <div className="space-y-1">
            <Label>Type de livrable *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label} {o.desc && `— ${o.desc}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-xs text-destructive">{errors.type}</p>}
          </div>

          {/* Date échéance */}
          <div className="space-y-1">
            <Label>Date d'échéance</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left", !echeance && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {echeance ? format(echeance, "dd/MM/yyyy", { locale: fr }) : "JJ/MM/AAAA"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={echeance}
                  onSelect={setEcheance}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {errors.echeance && <p className="text-xs text-destructive">{errors.echeance}</p>}
          </div>

          {/* Statut */}
          <div className="space-y-1">
            <Label>Statut initial</Label>
            <RadioGroup value={statut} onValueChange={setStatut} className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="non_produit" id="np" />
                <Label htmlFor="np" className="text-sm font-normal">Non produit</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="en_cours" id="ec" />
                <Label htmlFor="ec" className="text-sm font-normal">En cours</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="produit" id="pr" />
                <Label htmlFor="pr" className="text-sm font-normal">Produit</Label>
              </div>
            </RadioGroup>
          </div>

          {/* File */}
          <div className="space-y-1">
            <Label>Joindre un fichier (optionnel)</Label>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png,.svg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
              <Paperclip className="h-4 w-4 mr-2" />
              {file ? file.name : "Choisir un fichier"}
            </Button>
            <p className="text-xs text-muted-foreground">PDF, DOCX, XLSX, JPG, PNG — max 50 Mo</p>
            {errors.file && <p className="text-xs text-destructive">{errors.file}</p>}
          </div>

          {/* Commentaire */}
          <div className="space-y-1">
            <Label>Commentaire</Label>
            <Textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={2}
            />
          </div>

          {livrable?.updated_at && (
            <p className="text-xs text-muted-foreground">
              Dernière modification : {format(new Date(livrable.updated_at), "dd/MM/yyyy HH:mm", { locale: fr })}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
