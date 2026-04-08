import { useState, useMemo } from "react";
import { Loader2, ChevronDown, ChevronRight, Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useExtrantsData, type ActiviteWithExtrants, type Extrant } from "@/hooks/useExtrantsData";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useIsAdmin } from "@/hooks/useUserRoles";
import ExtrantDetailPanel from "@/components/extrants/ExtrantDetailPanel";
import ExtrantWizard from "@/components/extrants/ExtrantWizard";

const statutConfig: Record<string, { label: string; emoji: string; color: string }> = {
  non_produit: { label: "Non produit", emoji: "❌", color: "bg-muted text-muted-foreground" },
  en_cours: { label: "En cours", emoji: "⏳", color: "bg-warning/20 text-warning-foreground" },
  produit: { label: "Produit", emoji: "✅", color: "bg-success/20 text-success-foreground" },
  valide: { label: "Validé", emoji: "✔️", color: "bg-primary/20 text-primary" },
  rejete: { label: "Rejeté", emoji: "🔄", color: "bg-destructive/20 text-destructive" },
};

function getStatut(s: string) {
  return statutConfig[s] || statutConfig.non_produit;
}

const Extrants = () => {
  const { data: activites = [], isLoading, invalidate } = useExtrantsData();
  const isAdmin = useIsAdmin();
  const [filter, setFilter] = useState("all");
  const [selectedExtrant, setSelectedExtrant] = useState<Extrant | null>(null);
  const [selectedActiviteId, setSelectedActiviteId] = useState<string | null>(null);
  const [initialTab, setInitialTab] = useState<string | undefined>();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardActiviteId, setWizardActiviteId] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(activites.map((a) => a.id)));

  const filtered = useMemo(() => {
    if (filter === "all") return activites;
    return activites.filter((a) => a.code === filter);
  }, [activites, filter]);

  const totals = useMemo(() => {
    const all = activites.flatMap((a) => a.extrants);
    return {
      total: all.length,
      produits: all.filter((e) => e.statut === "produit" || e.statut === "valide").length,
      enCours: all.filter((e) => e.statut === "en_cours").length,
      nonProduits: all.filter((e) => e.statut === "non_produit").length,
    };
  }, [activites]);

  const tauxProd = totals.total > 0 ? Math.round((totals.produits / totals.total) * 100) : 0;

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openDetail = (ext: Extrant, actId: string, tab?: string) => {
    setSelectedExtrant(ext);
    setSelectedActiviteId(actId);
    setInitialTab(tab);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Chargement des extrants...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Extrants (GAR) — Action 302</h1>
        <p className="text-sm text-muted-foreground">{totals.total} extrants officiels répartis sur 5 activités</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total extrants</p>
            <p className="text-2xl font-bold text-foreground">{totals.total}</p>
          </CardContent>
        </Card>
        <Card className="border-success/30">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">✅ Produits / Validés</p>
            <p className="text-2xl font-bold text-success-foreground">{totals.produits}</p>
          </CardContent>
        </Card>
        <Card className="border-warning/30">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">⏳ En cours</p>
            <p className="text-2xl font-bold text-warning-foreground">{totals.enCours}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Taux de production</p>
            <p className="text-2xl font-bold text-foreground">{tauxProd}%</p>
            <Progress value={tauxProd} className="h-1.5 mt-1" />
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">Toutes</TabsTrigger>
          {activites.map((a) => (
            <TabsTrigger key={a.code} value={a.code}>{a.code}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Activité sections */}
      <div className="space-y-4">
        {filtered.map((act) => {
          const actProduits = act.extrants.filter((e) => e.statut === "produit" || e.statut === "valide").length;
          const actEnCours = act.extrants.filter((e) => e.statut === "en_cours").length;
          const isOpen = openSections.has(act.id);

          return (
            <Collapsible key={act.id} open={isOpen} onOpenChange={() => toggleSection(act.id)}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <Badge className="bg-primary text-primary-foreground">{act.code}</Badge>
                        <CardTitle className="text-sm">{act.libelle}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{act.extrants.length} extrants</span>
                        <span className="text-success-foreground">✅ {actProduits}</span>
                        <span className="text-warning-foreground">⏳ {actEnCours}</span>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-2">
                    {act.extrants.map((ext) => {
                      const st = getStatut(ext.statut);
                      const totalCrit = ext.criteres?.length ?? 0;
                      const validCrit = ext.criteres?.filter((c) => c.valide_final).length ?? 0;
                      const noCriteres = totalCrit === 0;

                      return (
                        <div
                          key={ext.id}
                          className="group flex items-start justify-between p-3 rounded-lg border hover:bg-accent/20 transition-colors cursor-pointer"
                          onClick={() => openDetail(ext, act.id)}
                        >
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs font-mono">{ext.reference}</Badge>
                              <span className="text-sm font-medium text-foreground truncate">{ext.libelle}</span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">Indicateur : {ext.indicateur_mesure}</p>
                            {totalCrit > 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Critères : <span className={validCrit === totalCrit ? "text-success-foreground font-semibold" : validCrit > 0 ? "text-warning-foreground" : "text-destructive"}>{validCrit}/{totalCrit}</span> validés
                              </p>
                            ) : noCriteres && (
                              <button
                                className="flex items-center gap-1 text-xs text-warning-foreground hover:underline"
                                onClick={(e) => { e.stopPropagation(); openDetail(ext, act.id, "criteres"); }}
                              >
                                <AlertTriangle className="h-3 w-3" /> Critères manquants
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-2 shrink-0">
                            <Badge className={`text-xs ${st.color}`}>{st.emoji} {st.label}</Badge>
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => { e.stopPropagation(); openDetail(ext, act.id, "info"); }}
                                  title="Modifier"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                  onClick={(e) => { e.stopPropagation(); openDetail(ext, act.id); }}
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => { setWizardActiviteId(act.id); setWizardOpen(true); }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter un extrant
                      </Button>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Detail panel */}
      <ExtrantDetailPanel
        extrant={selectedExtrant}
        activiteId={selectedActiviteId}
        open={!!selectedExtrant}
        onClose={() => { setSelectedExtrant(null); setInitialTab(undefined); }}
        isAdmin={isAdmin}
        onUpdate={invalidate}
        initialTab={initialTab}
      />

      {/* Wizard */}
      {wizardOpen && wizardActiviteId && (
        <ExtrantWizard
          activiteId={wizardActiviteId}
          activites={activites}
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          onCreated={invalidate}
        />
      )}
    </div>
  );
};

export default Extrants;
