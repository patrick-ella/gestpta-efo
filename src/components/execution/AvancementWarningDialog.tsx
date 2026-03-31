import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, XCircle } from "lucide-react";
import type { AvancementWarning } from "@/hooks/useAvancementRules";

interface BlockDialogProps {
  open: boolean;
  onClose: () => void;
  message: string;
}

export const AvancementBlockDialog = ({ open, onClose, message }: BlockDialogProps) => (
  <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
          <XCircle className="h-5 w-5" /> Action bloquée
        </AlertDialogTitle>
        <AlertDialogDescription className="text-sm">{message}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogAction onClick={onClose}>Compris</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

interface WarningDialogProps {
  open: boolean;
  warnings: AvancementWarning[];
  onCancel: () => void;
  onConfirm: (justification?: string) => void;
}

export const AvancementWarningDialog = ({ open, warnings, onCancel, onConfirm }: WarningDialogProps) => {
  const [justification, setJustification] = useState("");
  const needsJustification = warnings.some((w) => w.requiresJustification);

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-warning-foreground">
            <AlertTriangle className="h-5 w-5" /> Attention
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {warnings.map((w, i) => (
                <p key={i} className="text-sm text-muted-foreground">⚠️ {w.message}</p>
              ))}
              {needsJustification && (
                <Textarea
                  placeholder="Raison de la modification (obligatoire)…"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  rows={2}
                  className="mt-2"
                />
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(justification || undefined)}
            disabled={needsJustification && !justification.trim()}
          >
            Confirmer quand même
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
