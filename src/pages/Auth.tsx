import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { EfoLogo } from "@/components/ui/EfoLogo";
import { Separator } from "@/components/ui/separator";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Erreur d'authentification",
        description: error.message === "Invalid login credentials"
          ? "Identifiants invalides. Vérifiez votre email et mot de passe."
          : error.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email) {
      toast({ title: "Veuillez saisir votre adresse email", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email envoyé", description: "Vérifiez votre boîte de réception pour réinitialiser votre mot de passe." });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="flex justify-center">
            <EfoLogo size="lg" variant="color" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-primary">GPerf-EFO</h1>
            <p className="text-sm text-muted-foreground italic">
              Gestion de la Performance de l'EFO
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <Separator className="mb-5" />
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Se connecter
            </Button>
          </form>
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Mot de passe oublié ?
            </button>
          </div>
          <Separator className="my-4" />
          <p className="text-center text-xs text-muted-foreground">
            Exercice budgétaire actif : <span className="font-semibold">2026</span>
          </p>
        </CardContent>
      </Card>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        © 2026 EFO / CCAA — Sous-programme 3, Action 302
      </p>
    </div>
  );
};

export default Auth;
