import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useLivrablesData } from "@/hooks/useLivrablesData";
import { useUserRoles } from "@/hooks/useUserRoles";
import { LivrablesSummaryCards } from "@/components/livrables/LivrablesSummaryCards";
import { LivrablesFilterBar } from "@/components/livrables/LivrablesFilterBar";
import { LivrablesTable } from "@/components/livrables/LivrablesTable";
import { DocumentArchive } from "@/components/livrables/DocumentArchive";

const defaultFilters = { activite: "all", statut: "all", search: "" };

const Livrables = () => {
  const { data: rawData = [], isLoading, updateLivrable } = useLivrablesData();
  const { data: roles = [] } = useUserRoles();
  const [filters, setFilters] = useState(defaultFilters);

  const isAdmin = roles.includes("super_admin") || roles.includes("admin_pta");
  const canMarkProduit =
    isAdmin || roles.includes("responsable_activite");
  const canUpload =
    canMarkProduit || roles.includes("agent_saisie");

  // Deduplicate activities to official 5 codes only
  const OFFICIAL_CODES = ["30201", "30202", "30203", "30204", "30205"];
  const deduplicatedData = useMemo(() => {
    const seen = new Set<string>();
    return rawData
      .filter((a) => {
        if (!OFFICIAL_CODES.includes(a.code)) return false;
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [rawData]);

  const filteredData = useMemo(() => {
    let result = deduplicatedData;

    if (filters.activite !== "all") {
      result = result.filter((a) => a.id === filters.activite);
    }

    if (filters.statut !== "all" || filters.search) {
      result = result
        .map((a) => ({
          ...a,
          taches: a.taches
            .map((t) => ({
              ...t,
              livrables: t.livrables.filter((l) => {
                if (filters.statut === "produit" && !l.produit) return false;
                if (filters.statut === "non_produit" && l.produit) return false;
                if (
                  filters.search &&
                  !l.libelle.toLowerCase().includes(filters.search.toLowerCase())
                )
                  return false;
                return true;
              }),
            }))
            .filter((t) => t.livrables.length > 0),
        }))
        .filter((a) => a.taches.length > 0);
    }

    return result;
  }, [deduplicatedData, filters]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Chargement des livrables...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Gestion des Livrables</h1>

      <LivrablesSummaryCards data={rawData} />

      <LivrablesFilterBar
        activites={rawData}
        filters={filters}
        onChange={(f) => setFilters((prev) => ({ ...prev, ...f }))}
        onReset={() => setFilters(defaultFilters)}
      />

      <Tabs defaultValue="livrables">
        <TabsList>
          <TabsTrigger value="livrables">Livrables par tâche</TabsTrigger>
          <TabsTrigger value="archive">Archive documentaire</TabsTrigger>
        </TabsList>

        <TabsContent value="livrables" className="mt-4">
          {filteredData.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Aucun livrable ne correspond aux critères de filtrage.
            </p>
          ) : (
            <LivrablesTable
              data={filteredData}
              canMarkProduit={canMarkProduit}
              canUpload={canUpload}
              onUpdate={(payload) => updateLivrable.mutate(payload)}
            />
          )}
        </TabsContent>

        <TabsContent value="archive" className="mt-4">
          <DocumentArchive data={rawData} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Livrables;
