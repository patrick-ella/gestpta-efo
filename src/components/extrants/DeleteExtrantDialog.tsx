import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeleteExtrantDialogProps {
  open: boolean;
  extrant: {
    reference: string;
    libelle: string;
    statut?: string | null;
    date_validation?: string | null;
  } | null;
  totalCrit: number;
  linkedCount: number;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

const normalizeReference = (value: string) => value.trim().toUpperCase();

const DeleteExtrantDialog = ({
  open,
  extrant,
  totalCrit,
  linkedCount,
  onCancel,
  onConfirm,
}: DeleteExtrantDialogProps) => {
  const [confirmRef, setConfirmRef] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setConfirmRef("");
      setDeleting(false);
    }
  }, [open]);

  if (!extrant) return null;

  const isMatch = normalizeReference(confirmRef) === normalizeReference(extrant.reference);

  const handleDelete = async () => {
    if (!isMatch || deleting) return;

    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !deleting) onCancel(); }}>
      <DialogContent
        className="max-w-md [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          if (!deleting) onCancel();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-destructive">🗑 Supprimer l'extrant</DialogTitle>
          <DialogDescription>
            Cette action est irréversible et supprimera aussi les éléments liés à cet extrant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">{extrant.reference}</Badge>
            <span className="text-sm text-foreground">{extrant.libelle}</span>
          </div>

          <div className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <p className="flex items-center gap-1 text-sm font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" /> Cette action supprimera également :
            </p>
            <ul className="ml-5 list-disc text-xs text-muted-foreground">
              <li>{totalCrit} critère(s) de validation</li>
              <li>{linkedCount} lien(s) avec des sous-tâches</li>
            </ul>
            <p className="text-xs font-semibold text-destructive">Cette action est IRRÉVERSIBLE.</p>
          </div>

          {extrant.statut === "valide" && (
            <div className="space-y-1 rounded-lg border-2 border-destructive bg-destructive/10 p-3">
              <p className="text-sm font-bold text-destructive">🔴 ATTENTION — Extrant déjà validé</p>
              <p className="text-xs text-muted-foreground">
                Cet extrant a été validé{extrant.date_validation ? ` le ${extrant.date_validation}` : ""}. Sa suppression est fortement déconseillée.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm">
              Pour confirmer, saisissez <span className="font-mono font-bold">{extrant.reference}</span> :
            </Label>
            <Input
              value={confirmRef}
              onChange={(e) => setConfirmRef(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  onCancel();
                  return;
                }

                if (e.key === "Enter") {
                  void handleDelete();
                }
              }}
              placeholder={extrant.reference}
              autoFocus
              autoComplete="off"
              className={
                confirmRef === ""
                  ? ""
                  : isMatch
                    ? "border-success focus-visible:ring-success"
                    : "border-destructive focus-visible:ring-destructive"
              }
            />
            {confirmRef !== "" && !isMatch && (
              <p className="text-xs text-destructive">
                ✗ Référence incorrecte — attendu : <span className="font-mono font-semibold">{extrant.reference}</span>
              </p>
            )}
            {isMatch && (
              <p className="text-xs text-success-foreground">✓ Référence confirmée — vous pouvez supprimer</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={deleting}>
            Annuler
          </Button>
          <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={!isMatch || deleting}>
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {deleting ? "Suppression..." : "🗑 Supprimer définitivement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteExtrantDialog;