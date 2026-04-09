import { lazy, Suspense, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ForcePasswordChangeModal } from "@/components/auth/ForcePasswordChangeModal";

// Lazy-loaded routes
const Auth = lazy(() => import("@/pages/Auth"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const CadreLogique = lazy(() => import("@/pages/CadreLogique"));
const PlanTravail = lazy(() => import("@/pages/PlanTravail"));
const Execution = lazy(() => import("@/pages/Execution"));
const Extrants = lazy(() => import("@/pages/Extrants"));
const ObjectifsEvaluation = lazy(() => import("@/pages/ObjectifsEvaluation"));
const Rapports = lazy(() => import("@/pages/Rapports"));
const Administration = lazy(() => import("@/pages/Administration"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <span className="ml-2 text-muted-foreground">Chargement...</span>
  </div>
);

const ProtectedRoutes = () => {
  const { session, user, loading } = useAuth();
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [checkingPassword, setCheckingPassword] = useState(true);

  useEffect(() => {
    const checkFlag = async () => {
      if (!user) { setCheckingPassword(false); return; }
      const { data } = await supabase
        .from("users_profiles")
        .select("must_change_password")
        .eq("id", user.id)
        .single();
      setMustChangePassword((data as any)?.must_change_password ?? false);
      setCheckingPassword(false);
    };
    if (!loading && user) checkFlag();
    else if (!loading) setCheckingPassword(false);
  }, [user, loading]);

  if (loading || checkingPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (mustChangePassword) {
    return <ForcePasswordChangeModal onPasswordChanged={() => setMustChangePassword(false)} />;
  }

  return (
    <AppLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cadre-logique" element={<CadreLogique />} />
          <Route path="/pta" element={<PlanTravail />} />
          <Route path="/execution" element={<Execution />} />
          <Route path="/extrants" element={<Extrants />} />
          <Route path="/objectifs-evaluation" element={<ObjectifsEvaluation />} />
          <Route path="/rapports" element={<Rapports />} />
          <Route path="/administration" element={<Administration />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
};

const AuthRoute = () => {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (session) return <Navigate to="/" replace />;
  return <Auth />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/auth" element={<AuthRoute />} />
              <Route path="/*" element={<ProtectedRoutes />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
