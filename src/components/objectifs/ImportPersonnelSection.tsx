import { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, FileSpreadsheet, X, Search, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface RowResult {
  rowNum: number;
  prenom: string; nom: string; email: string; matricule: string;
  direction: string; service: string; poste: string;
  emailN1: string; dateRecr: string; dateReclas: string; anciennete: string;
  errors: string[];
  warnings: string[];
  action: "create" | "update";
  valid: boolean;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  results: RowResult[];
  totalRows: number;
  validRows: number;
  errorRows: number;
  createRows: number;
  updateRows: number;
}

interface ImportResult {
  email: string; nom: string; prenom: string; matricule: string;
  action: string; tempPassword?: string; status: string; error?: string;
}

function generateGabaritPersonnel(): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const headers = [
    "Prénom *", "Nom *", "Email *", "Matricule *", "Direction *",
    "Service/Bureau", "Poste de travail *", "Email N+1 (Supérieur)",
    "Date recrutement (JJ/MM/AAAA)", "Date reclassement (JJ/MM/AAAA)", "Ancienneté au poste",
  ];
  const example = [
    "Jean", "DUPONT", "j.dupont@efo.cm", "12345", "Formation Continue",
    "Formation Continue", "Chef de service formations", "m.chef@efo.cm",
    "01/01/2015", "01/06/2022", "3 ans",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws["!cols"] = [
    { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 25 },
    { wch: 25 }, { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Personnel");

  const notice = XLSX.utils.aoa_to_sheet([
    ["NOTICE D'UTILISATION DU GABARIT"],
    [], ["CHAMPS OBLIGATOIRES (*)"],
    ["Prénom, Nom, Email, Matricule, Direction, Poste de travail"],
    [], ["FORMAT DES DATES"], ["Utilisez le format JJ/MM/AAAA"], ["Exemple : 01/01/2015"],
    [], ["EMAIL"], ["L'email sert d'identifiant de connexion."],
    ["Si l'agent existe déjà, son profil sera mis à jour."],
    [], ["MATRICULE"], ["Le matricule doit être unique."],
    [], ["EMAIL N+1"], ["Renseignez l'email du supérieur direct (N+1)."],
    ["Ce supérieur doit être présent dans le fichier ou dans l'application."],
    [], ["NE PAS MODIFIER"], ["- Ne pas modifier les en-têtes de colonnes"],
    ["- Ne pas supprimer la feuille Notice"], ["- Ne pas ajouter de colonnes"],
  ]);
  notice["!cols"] = [{ wch: 60 }];
  XLSX.utils.book_append_sheet(wb, notice, "Notice");

  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}

function downloadGabarit() {
  const buffer = generateGabaritPersonnel();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Gabarit_Import_Personnel_EFO.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

function parseDate(d: string): string | null {
  if (!d) return null;
  const parts = d.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

const ImportPersonnelSection = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [filter, setFilter] = useState<"all" | "valid" | "error">("all");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleFile = (f: File) => {
    if (f.size > 5 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "La taille maximale est de 5 Mo.", variant: "destructive" });
      return;
    }
    if (!f.name.endsWith(".xlsx")) {
      toast({ title: "Format invalide", description: "Seuls les fichiers .xlsx sont acceptés.", variant: "destructive" });
      return;
    }
    setFile(f);
    setValidationResult(null);
    setImportResults(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const analyzeFile = async () => {
    if (!file) return;
    setAnalyzing(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });

      if (!wb.SheetNames.includes("Personnel")) {
        setValidationResult({ valid: false, error: "Feuille \"Personnel\" introuvable. Utilisez le gabarit officiel.", results: [], totalRows: 0, validRows: 0, errorRows: 0, createRows: 0, updateRows: 0 });
        setShowPreview(true);
        return;
      }

      const ws = wb.Sheets["Personnel"];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as string[][];
      const dataRows = rows.slice(1).filter(row => row.some(cell => String(cell).trim() !== ""));

      if (dataRows.length === 0) {
        setValidationResult({ valid: false, error: "Aucune donnée trouvée dans la feuille Personnel.", results: [], totalRows: 0, validRows: 0, errorRows: 0, createRows: 0, updateRows: 0 });
        setShowPreview(true);
        return;
      }

      const { data: existingProfiles } = await supabase.from("users_profiles").select("id, email");
      const existingEmails = new Set((existingProfiles ?? []).map(p => p.email?.toLowerCase()));

      const seenEmails = new Set<string>();
      const seenMatricules = new Set<string>();
      const results: RowResult[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 2;
        const errors: string[] = [];
        const warnings: string[] = [];

        const prenom = String(row[0] ?? "").trim();
        const nom = String(row[1] ?? "").trim();
        const email = String(row[2] ?? "").trim().toLowerCase();
        const matricule = String(row[3] ?? "").trim();
        const direction = String(row[4] ?? "").trim();
        const service = String(row[5] ?? "").trim();
        const poste = String(row[6] ?? "").trim();
        const emailN1 = String(row[7] ?? "").trim().toLowerCase();
        const dateRecr = String(row[8] ?? "").trim();
        const dateReclas = String(row[9] ?? "").trim();
        const anciennete = String(row[10] ?? "").trim();

        if (!prenom) errors.push("Prénom manquant");
        if (!nom) errors.push("Nom manquant");
        if (!email) errors.push("Email manquant");
        if (!matricule) errors.push("Matricule manquant");
        if (!direction) errors.push("Direction manquante");
        if (!poste) errors.push("Poste manquant");

        if (email && !email.includes("@")) errors.push(`Email invalide : "${email}"`);
        if (email && seenEmails.has(email)) errors.push("Email en doublon dans le fichier");
        else if (email) seenEmails.add(email);
        if (matricule && seenMatricules.has(matricule)) errors.push("Matricule en doublon");
        else if (matricule) seenMatricules.add(matricule);

        const isValidDate = (d: string) => !d || /^\d{2}\/\d{2}\/\d{4}$/.test(d);
        if (dateRecr && !isValidDate(dateRecr)) errors.push(`Date recrutement invalide : "${dateRecr}"`);
        if (dateReclas && !isValidDate(dateReclas)) errors.push(`Date reclassement invalide : "${dateReclas}"`);

        const action = existingEmails.has(email) ? "update" as const : "create" as const;

        results.push({ rowNum, prenom, nom, email, matricule, direction, service, poste, emailN1, dateRecr, dateReclas, anciennete, errors, warnings, action, valid: errors.length === 0 });
      }

      const vr: ValidationResult = {
        valid: true, results,
        totalRows: results.length,
        validRows: results.filter(r => r.valid).length,
        errorRows: results.filter(r => !r.valid).length,
        createRows: results.filter(r => r.valid && r.action === "create").length,
        updateRows: results.filter(r => r.valid && r.action === "update").length,
      };
      setValidationResult(vr);
      setShowPreview(true);
    } catch (err: any) {
      toast({ title: "Erreur d'analyse", description: err.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const executeImport = async () => {
    if (!validationResult) return;
    const validRows = validationResult.results.filter(r => r.valid);
    setImporting(true);
    setImportProgress(0);

    try {
      const agents = validRows.map(r => ({
        prenom: r.prenom, nom: r.nom, email: r.email, matricule: r.matricule,
        direction: r.direction, service: r.service, poste: r.poste,
        emailN1: r.emailN1,
        dateRecr: parseDate(r.dateRecr),
        dateReclas: parseDate(r.dateReclas),
        anciennete: r.anciennete,
        importAction: r.action,
      }));

      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "bulk_import", agents },
      });

      if (error) throw error;

      const results = data.results as ImportResult[];
      setImportResults(results);
      setImportProgress(100);

      const created = results.filter(r => r.status === "ok" && r.action === "created").length;
      const updated = results.filter(r => r.status === "ok" && r.action === "updated").length;
      const errors = results.filter(r => r.status === "error").length;

      qc.invalidateQueries({ queryKey: ["all-profiles"] });
      qc.invalidateQueries({ queryKey: ["agents-profils-all"] });
      qc.invalidateQueries({ queryKey: ["all-profiles-supervisors"] });

      toast({ title: `✅ Import terminé : ${created} créés, ${updated} mis à jour${errors > 0 ? `, ${errors} erreurs` : ""}` });
    } catch (err: any) {
      toast({ title: "Erreur d'import", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const downloadReport = () => {
    if (!importResults) return;
    const wb = XLSX.utils.book_new();
    const data = importResults.map(r => [r.prenom, r.nom, r.email, r.matricule, r.action === "created" ? "Créé" : "Mis à jour", r.tempPassword ?? "—", r.status === "ok" ? "✅ OK" : `❌ ${r.error ?? "Erreur"}`]);
    const ws = XLSX.utils.aoa_to_sheet([["Prénom", "Nom", "Email", "Matricule", "Action", "Mot de passe temp.", "Statut"], ...data]);
    ws["!cols"] = [{ wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, "Rapport");
    const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const d = new Date();
    a.download = `Rapport_Import_Personnel_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredRows = validationResult?.results.filter(r => {
    if (filter === "valid") return r.valid;
    if (filter === "error") return !r.valid;
    return true;
  }) ?? [];

  return (
    <>
      <Card className="border-dashed">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Import en masse du personnel</h3>
          </div>

          <p className="text-sm text-muted-foreground">
            Étape 1 : Téléchargez le gabarit Excel, remplissez-le avec les données du personnel, puis importez-le ci-dessous.
          </p>

          <Button variant="outline" onClick={downloadGabarit}>
            <Download className="h-4 w-4 mr-2" /> Télécharger le gabarit Excel
          </Button>

          <p className="text-sm text-muted-foreground">Étape 2 : Importez le fichier rempli</p>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-border"}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(0)} Ko)</span>
                <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setFile(null); setValidationResult(null); setImportResults(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <FileSpreadsheet className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Glisser-déposer le fichier ici ou cliquer pour sélectionner</p>
                <p className="text-xs text-muted-foreground">Format accepté : .xlsx — max 5 Mo</p>
              </div>
            )}
          </div>

          {file && !validationResult && (
            <Button onClick={analyzeFile} disabled={analyzing}>
              {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              {analyzing ? "Analyse en cours..." : "Analyser le fichier"}
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPreview} onOpenChange={v => { if (!importing) setShowPreview(v); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{importResults ? "✅ Import terminé" : "🔍 Prévisualisation de l'import"}</DialogTitle>
          </DialogHeader>

          {validationResult?.error && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{validationResult.error}</span>
            </div>
          )}

          {importResults ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <Card><CardContent className="pt-4 pb-3"><p className="text-2xl font-bold text-green-600">{importResults.filter(r => r.action === "created" && r.status === "ok").length}</p><p className="text-xs text-muted-foreground">Agents créés</p></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><p className="text-2xl font-bold text-blue-600">{importResults.filter(r => r.action === "updated" && r.status === "ok").length}</p><p className="text-xs text-muted-foreground">Mis à jour</p></CardContent></Card>
                <Card><CardContent className="pt-4 pb-3"><p className="text-2xl font-bold text-destructive">{importResults.filter(r => r.status === "error").length}</p><p className="text-xs text-muted-foreground">Erreurs</p></CardContent></Card>
              </div>
              {importResults.some(r => r.action === "created" && r.status === "ok") && (
                <p className="text-sm text-muted-foreground">Les agents créés ont reçu un mot de passe temporaire de type EFO@XXXX.</p>
              )}
              <Button variant="outline" onClick={downloadReport}>
                <Download className="h-4 w-4 mr-2" /> Télécharger le rapport d'import
              </Button>
            </div>
          ) : validationResult && validationResult.results.length > 0 && (
            <div className="space-y-4">
              {importing ? (
                <div className="space-y-3 py-4">
                  <p className="text-sm font-medium text-center">⏳ Import en cours...</p>
                  <Progress value={importProgress} />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <Card><CardContent className="pt-3 pb-2"><p className="text-xl font-bold">{validationResult.totalRows}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
                    <Card><CardContent className="pt-3 pb-2"><p className="text-xl font-bold text-green-600">{validationResult.validRows}</p><p className="text-xs text-muted-foreground">Valides</p></CardContent></Card>
                    <Card><CardContent className="pt-3 pb-2"><p className="text-xl font-bold text-destructive">{validationResult.errorRows}</p><p className="text-xs text-muted-foreground">Erreurs</p></CardContent></Card>
                    <Card><CardContent className="pt-3 pb-2"><p className="text-xs text-muted-foreground">➕ {validationResult.createRows} créer · 🔄 {validationResult.updateRows} maj</p></CardContent></Card>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>Tous</Button>
                    <Button size="sm" variant={filter === "valid" ? "default" : "outline"} onClick={() => setFilter("valid")}>✅ Valides</Button>
                    <Button size="sm" variant={filter === "error" ? "default" : "outline"} onClick={() => setFilter("error")}>❌ Erreurs</Button>
                  </div>

                  <div className="max-h-64 overflow-y-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Nom</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRows.map(r => (
                          <TableRow key={r.rowNum}>
                            <TableCell className="text-xs">{r.rowNum}</TableCell>
                            <TableCell className="text-sm">{r.nom} {r.prenom}</TableCell>
                            <TableCell className="text-xs">{r.email}</TableCell>
                            <TableCell>
                              {r.valid ? (
                                <Badge variant={r.action === "create" ? "default" : "secondary"} className={r.action === "create" ? "bg-green-600" : "bg-blue-600 text-primary-foreground"}>
                                  {r.action === "create" ? "➕ Créer" : "🔄 Mettre à jour"}
                                </Badge>
                              ) : (
                                <div>
                                  <Badge variant="destructive">❌ Erreur</Badge>
                                  <p className="text-xs text-destructive mt-1">{r.errors.join(", ")}</p>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {validationResult.errorRows > 0 && (
                    <p className="text-sm text-muted-foreground">⚠️ {validationResult.errorRows} ligne(s) contiennent des erreurs et ne seront pas importées.</p>
                  )}
                </>
              )}
            </div>
          )}

          <DialogFooter>
            {!importResults && !importing && (
              <>
                <Button variant="outline" onClick={() => setShowPreview(false)}>Annuler</Button>
                {validationResult && validationResult.validRows > 0 && (
                  <Button onClick={executeImport}>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Confirmer l'import ({validationResult.validRows})
                  </Button>
                )}
              </>
            )}
            {importResults && (
              <Button onClick={() => { setShowPreview(false); setFile(null); setValidationResult(null); setImportResults(null); }}>Fermer</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImportPersonnelSection;
