import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KeyRound, Loader2, Eye, EyeOff, AlertTriangle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ResetPasswordModalProps {
  isOpen: boolean;
  user: { id: string; email: string; nom: string; prenom: string } | null;
  onSuccess: () => void;
  onCancel: () => void;
}

function getStrength(pwd: string) {
  if (!pwd) return null;
  if (pwd.length < 8) return { label: "Trop court", color: "bg-destructive", width: "25%" };
  if (pwd.length < 10) return { label: "Faible", color: "bg-yellow-500", width: "50%" };
  if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd))
    return { label: "Fort", color: "bg-green-500", width: "100%" };
  return { label: "Moyen", color: "bg-blue-500", width: "75%" };
}

export const ResetPasswordModal = ({ isOpen, user, onSuccess, onCancel }: ResetPasswordModalProps) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewPassword("");
      setConfirmPassword("");
      setShowNew(false);
      setShowConfirm(false);
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!user) return null;

  const strength = getStrength(newPassword);
  const isValid = newPassword.length >= 8 && newPassword === confirmPassword;

  const handleReset = async () => {
    if (!isValid) return;
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await supabase.functions.invoke("admin-users", {
        body: { action: "reset_password_direct", user_id: user.id, new_password: newPassword },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (resp.error) throw new Error(resp.error.message);
      if (resp.data?.error) throw new Error(resp.data.error);

      toast.success(`Mot de passe de ${user.prenom} ${user.nom} réinitialisé. L'utilisateur devra le modifier à sa prochaine connexion.`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Impossible de réinitialiser le mot de passe.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-amber-600" />
            Réinitialiser le mot de passe
          </DialogTitle>
          <DialogDescription>
            {user.prenom} {user.nom} — {user.email}
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs">
            Un mot de passe temporaire sera défini pour cet utilisateur. Il sera contraint de le modifier dès sa prochaine connexion.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nouveau mot de passe temporaire *</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
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
            {strength && (
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${strength.color} transition-all`} style={{ width: strength.width }} />
                </div>
                <span className="text-xs text-muted-foreground">{strength.label}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Confirmer le mot de passe *</Label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && isValid) handleReset(); }}
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
        </div>

        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs">
            L'utilisateur devra obligatoirement changer ce mot de passe à sa prochaine connexion.
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>Annuler</Button>
          <Button
            onClick={handleReset}
            disabled={!isValid || isLoading}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
            Réinitialiser le MDP
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
