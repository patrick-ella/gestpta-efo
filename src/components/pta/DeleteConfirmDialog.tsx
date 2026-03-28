import { useState, useEffect } from "react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  code: string;
  libelle: string;
  budget?: number;
  warnings: string[];
  onConfirm: () => Promise<void>;
  blocked?: string | null;
}

export const DeleteConfirmDialog = ({ open, onOpenChange, title, code, libelle, budget, warnings, onConfirm, blocked }: Props) => {
  const [confirmCode, setConfirmCode] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { if (!open) setConfirmCode(""); }, [open]);

  const codeMatch = confirmCode === code;

  const handleConfirm = async () => {
    if (!codeMatch || blocked) return;
    setDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally { setDeleting(false); }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" /> {title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>Vous êtes sur le point de supprimer :</p>
              <p className="font-semibold text-foreground">[{code}] {libelle}</p>
              {budget != null && <p className="text-sm">Budget : {budget.toLocaleString("fr-FR")} FCFA</p>}

              {blocked ? (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  🚫 {blocked}
                </div>
              ) : (
                <>
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm space-y-1">
                    <p className="font-semibold">⚠️ Cette action supprimera également :</p>
                    {warnings.map((w, i) => <p key={i}>• {w}</p>)}
                    <p className="font-semibold mt-2">Cette action est IRRÉVERSIBLE.</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm">Pour confirmer, saisissez le code :</p>
                    <Input value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)} placeholder={code} autoFocus />
                    <p className="text-xs text-muted-foreground">Tapez <span className="font-mono font-bold">{code}</span> pour confirmer</p>
                  </div>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          {!blocked && (
            <AlertDialogAction onClick={handleConfirm} disabled={!codeMatch || deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Supprimer définitivement
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
