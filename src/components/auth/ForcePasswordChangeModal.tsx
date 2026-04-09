import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ForcePasswordChangeModalProps {
  onPasswordChanged: () => void;
}

export const ForcePasswordChangeModal = ({ onPasswordChanged }: ForcePasswordChangeModalProps) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isValid = newPassword.length >= 8 && newPassword === confirmPassword;

  const handleChange = async () => {
    if (!isValid) return;
    setIsLoading(true);
    setError("");

    try {
      const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
      if (authError) throw authError;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("users_profiles").update({ must_change_password: false } as any).eq("id", user.id);
        await supabase.from("journal_audit").insert({
          action: "PASSWORD_CHANGED",
          entite: "user",
          user_id: user.id,
          nouvelle_valeur: { must_change_password: false, changed_by_user: true },
        });
      }

      toast.success("Mot de passe mis à jour avec succès. Bienvenue dans GestPTA-EFO !");
      onPasswordChanged();
    } catch (err: any) {
      setError(err.message || "Erreur lors du changement de mot de passe.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Changement de mot de passe requis
          </DialogTitle>
          <DialogDescription>
            Votre mot de passe a été réinitialisé par l'administrateur. Vous devez définir un nouveau mot de passe personnel avant de continuer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nouveau mot de passe *</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                autoFocus
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Minimum 8 caractères</p>
          </div>

          <div className="space-y-2">
            <Label>Confirmer le nouveau mot de passe *</Label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && isValid) handleChange(); }}
                placeholder="Répétez le mot de passe"
                className={`pr-10 ${confirmPassword && confirmPassword === newPassword ? "border-green-500" : confirmPassword ? "border-destructive" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && confirmPassword === newPassword && (
              <p className="text-xs text-green-600">✓ Les mots de passe correspondent</p>
            )}
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-xs text-destructive">✗ Les mots de passe ne correspondent pas</p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <Button onClick={handleChange} disabled={!isValid || isLoading} className="w-full">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
            Définir mon nouveau mot de passe
          </Button>

          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-xs">
              Vous ne pouvez pas accéder à l'application sans effectuer cette action.
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
};
