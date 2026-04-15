import { useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Download, Trash2, Paperclip, FileText, FileSpreadsheet, Image as ImageIcon, Link as LinkIcon, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { detectPlatform, isValidUrl } from "@/lib/platformDetector";

interface Props {
  extrantId: string;
  extrantRef: string;
  activiteCode: string;
  onCountChange?: (count: number) => void;
}

interface Preuve {
  id: string;
  libelle: string;
  fichier_url: string | null;
  fichier_nom: string | null;
  fichier_taille: number | null;
  fichier_type: string | null;
  observations: string | null;
  depose_le: string;
  depose_par: string;
  depose_par_profile?: { nom: string | null; prenom: string | null } | null;
  type_preuve: string;
  url_lien: string | null;
  plateforme: string | null;
}

const ACCEPTED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "image/jpeg", "image/jpg", "image/png", "image/svg+xml"];
const ACCEPTED_EXTENSIONS = ".pdf,.docx,.xlsx,.jpg,.jpeg,.png,.svg";
const MAX_SIZE = 50 * 1024 * 1024;

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function getFileIcon(type: string | null) {
  if (!type) return <Paperclip className="h-5 w-5 text-muted-foreground" />;
  if (type.includes("pdf")) return <FileText className="h-5 w-5 text-destructive" />;
  if (type.includes("word") || type.includes("document")) return <FileText className="h-5 w-5 text-primary" />;
  if (type.includes("sheet") || type.includes("excel")) return <FileSpreadsheet className="h-5 w-5 text-success-foreground" />;
  if (type.includes("image")) return <ImageIcon className="h-5 w-5 text-warning-foreground" />;
  return <Paperclip className="h-5 w-5 text-muted-foreground" />;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR") + " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

const PreuvesTab = ({ extrantId, extrantRef, activiteCode, onCountChange }: Props) => {
  const { user } = useAuth();
  const { data: roles = [] } = useUserRoles();
  const queryClient = useQueryClient();

  const isAdmin = roles.includes("super_admin") || roles.includes("admin_pta");
  const canUpload = roles.some((r) => ["super_admin", "admin_pta", "responsable_activite", "agent_saisie"].includes(r));

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<"fichier" | "url">("fichier");
  const [libelle, setLibelle] = useState("");
  const [observations, setObservations] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileError, setFileError] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLibelle, setEditLibelle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL proof state
  const [urlLien, setUrlLien] = useState("");
  const [urlSubmitting, setUrlSubmitting] = useState(false);

  const urlPlatform = urlLien ? detectPlatform(urlLien) : null;
  const urlValid = isValidUrl(urlLien);

  const { data: preuves = [], isLoading, error } = useQuery({
    queryKey: ["extrants-preuves", extrantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extrants_preuves")
        .select("id, libelle, fichier_url, fichier_nom, fichier_taille, fichier_type, observations, depose_le, depose_par, type_preuve, url_lien, plateforme")
        .eq("extrant_id", extrantId)
        .order("depose_le", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data ?? []).map((p: any) => p.depose_par))];
      let profilesMap: Record<string, { nom: string | null; prenom: string | null }> = {};
      if (userIds.length) {
        const { data: profiles } = await supabase.from("users_profiles").select("id, nom, prenom").in("id", userIds);
        (profiles ?? []).forEach((p: any) => { profilesMap[p.id] = { nom: p.nom, prenom: p.prenom }; });
      }

      const result = (data ?? []).map((p: any) => ({
        ...p,
        type_preuve: p.type_preuve ?? "fichier",
        depose_par_profile: profilesMap[p.depose_par] || null,
      }));

      onCountChange?.(result.length);
      return result as Preuve[];
    },
    enabled: !!extrantId,
    staleTime: 0,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["extrants-preuves", extrantId] });
    queryClient.invalidateQueries({ queryKey: ["extrants-data"] });
  }, [extrantId, queryClient]);

  const validateFile = (f: File): string => {
    if (!ACCEPTED_TYPES.includes(f.type) && !f.name.match(/\.(pdf|docx|xlsx|jpg|jpeg|png|svg)$/i)) {
      return "Format non supporté. Formats acceptés : PDF, DOCX, XLSX, JPG, PNG, SVG";
    }
    if (f.size > MAX_SIZE) return "Fichier trop volumineux. Taille maximale : 50 Mo";
    return "";
  };

  const handleFileSelect = (f: File | null) => {
    if (!f) { setFile(null); setFileError(""); return; }
    const err = validateFile(f);
    if (err) { setFileError(err); setFile(null); return; }
    setFile(f);
    setFileError("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  };

  const handleUpload = async () => {
    if (!file || !libelle.trim()) {
      if (!libelle.trim()) toast.error("Le libellé est obligatoire");
      return;
    }
    setUploading(true);
    setUploadProgress(10);
    try {
      const path = `${activiteCode}/${extrantRef}/${Date.now()}_${file.name}`;
      setUploadProgress(30);

      const { error: uploadError } = await supabase.storage
        .from("extrants-preuves")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      setUploadProgress(70);

      const { error: insertError } = await supabase.from("extrants_preuves").insert({
        extrant_id: extrantId,
        libelle: libelle.trim(),
        fichier_url: path,
        fichier_nom: file.name,
        fichier_taille: file.size,
        fichier_type: file.type,
        depose_par: user!.id,
        observations: observations.trim() || null,
        type_preuve: "fichier" as any,
      });
      if (insertError) throw insertError;
      setUploadProgress(100);

      toast.success("✅ Preuve déposée avec succès");
      resetAndClose();
      invalidate();
    } catch (err: any) {
      toast.error(`❌ Erreur lors du dépôt : ${err.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleAddUrl = async () => {
    if (!libelle.trim() || !urlValid) return;
    setUrlSubmitting(true);
    try {
      const platform = detectPlatform(urlLien);
      const { error } = await supabase.from("extrants_preuves").insert({
        extrant_id: extrantId,
        libelle: libelle.trim(),
        type_preuve: "url" as any,
        url_lien: urlLien.trim() as any,
        plateforme: platform.key as any,
        depose_par: user!.id,
        observations: observations.trim() || null,
      });
      if (error) throw error;
      toast.success(`✅ Lien ${platform.label} ajouté comme preuve`);
      resetAndClose();
      invalidate();
    } catch (err: any) {
      toast.error(`❌ Erreur : ${err.message}`);
    } finally {
      setUrlSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setUploadOpen(false);
    setLibelle("");
    setObservations("");
    setFile(null);
    setFileError("");
    setUrlLien("");
    setUploadMode("fichier");
  };

  const handleDownload = async (preuve: Preuve) => {
    try {
      setDownloadingId(preuve.id);
      const { data, error } = await supabase.storage
        .from("extrants-preuves")
        .createSignedUrl(preuve.fichier_url!, 60);
      if (error) throw error;

      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = preuve.fichier_nom || "fichier";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error("❌ Erreur lors du téléchargement");
    } finally {
      setTimeout(() => setDownloadingId(null), 1000);
    }
  };

  const handleDelete = async (preuve: Preuve) => {
    try {
      if (preuve.type_preuve === "fichier" && preuve.fichier_url) {
        await supabase.storage.from("extrants-preuves").remove([preuve.fichier_url]);
      }
      const { error } = await supabase.from("extrants_preuves").delete().eq("id", preuve.id);
      if (error) throw error;
      toast.success("🗑 Preuve supprimée");
      setDeletingId(null);
      invalidate();
    } catch (err: any) {
      toast.error(`❌ Erreur : ${err.message}`);
    }
  };

  const fichierCount = preuves.filter((p) => p.type_preuve === "fichier").length;
  const urlCount = preuves.filter((p) => p.type_preuve === "url").length;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 space-y-2">
        <p className="text-sm text-destructive">❌ Erreur de chargement des preuves</p>
        <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["extrants-preuves", extrantId] })}>
          🔄 Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Preuves documentaires</p>
          <p className="text-xs text-muted-foreground">
            Déposez des fichiers ou ajoutez des liens URL comme preuves.
            {preuves.length > 0 && (
              <span className="ml-1">
                {fichierCount > 0 && <span>📄 {fichierCount} fichier(s)</span>}
                {fichierCount > 0 && urlCount > 0 && " · "}
                {urlCount > 0 && <span>🔗 {urlCount} lien(s)</span>}
              </span>
            )}
          </p>
        </div>
        {canUpload && (
          <Button size="sm" onClick={() => setUploadOpen(true)} className="shrink-0">
            <Paperclip className="h-3.5 w-3.5 mr-1" /> Ajouter
          </Button>
        )}
      </div>

      {/* Empty state */}
      {preuves.length === 0 ? (
        <div className="text-center py-8 space-y-3 border rounded-lg bg-muted/20">
          <Paperclip className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">Aucune preuve déposée</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Déposez des documents ou ajoutez des liens URL pour attester la production de cet extrant.
          </p>
          {canUpload && (
            <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
              <Paperclip className="h-3.5 w-3.5 mr-1" /> Ajouter une preuve
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {preuves.map((p) => {
              const platform = p.type_preuve === "url" ? detectPlatform(p.url_lien ?? "") : null;
              const isUrl = p.type_preuve === "url";

              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-lg border border-border bg-card transition-colors ${isUrl ? platform?.bgClass ?? "" : ""}`}
                  style={{ borderLeftWidth: "3px", borderLeftColor: isUrl ? platform?.color : "hsl(var(--primary))" }}
                >
                  <div className="flex items-start gap-3">
                    <div className="pt-0.5 shrink-0 text-lg">
                      {isUrl ? (platform?.icon ?? "🔗") : getFileIcon(p.fichier_type)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium text-foreground">{p.libelle}</p>
                      <p className="text-xs text-muted-foreground">
                        {isUrl ? (
                          <>
                            <Badge variant="outline" className="text-xs mr-1 py-0">{platform?.label}</Badge>
                            <span className="font-mono text-[11px]">
                              {(() => { try { return new URL(p.url_lien ?? "").hostname.replace("www.", ""); } catch { return ""; } })()}
                            </span>
                          </>
                        ) : (
                          <>{p.fichier_nom} — {formatFileSize(p.fichier_taille)}</>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        👤 {p.depose_par_profile ? `${p.depose_par_profile.prenom ?? ""} ${p.depose_par_profile.nom ?? ""}`.trim() || "Utilisateur" : "Utilisateur"}
                        {" · "}📅 {formatDate(p.depose_le)}
                      </p>
                      {p.observations && (
                        <p className="text-xs text-muted-foreground italic">💬 {p.observations}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                    {isUrl ? (
                      <Button variant="outline" size="sm" className="text-xs" asChild>
                        <a href={p.url_lien ?? "#"} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" /> Ouvrir le lien
                        </a>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleDownload(p)}
                        disabled={downloadingId === p.id}
                      >
                        {downloadingId === p.id ? (
                          <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Téléchargement...</>
                        ) : (
                          <><Download className="h-3 w-3 mr-1" /> Télécharger</>
                        )}
                      </Button>
                    )}

                    {isAdmin && (
                      <>
                        {deletingId === p.id ? (
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-muted-foreground">Supprimer ?</span>
                            <Button variant="destructive" size="sm" className="h-6 text-xs" onClick={() => handleDelete(p)}>Confirmer</Button>
                            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setDeletingId(null)}>Annuler</Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => setDeletingId(p.id)}>
                            <Trash2 className="h-3 w-3 mr-1" /> Supprimer
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground italic">
            📎 {preuves.length} preuve(s) — Dernière mise à jour : {preuves.length > 0 ? new Date(preuves[0].depose_le).toLocaleDateString("fr-FR") : "—"}
          </p>
        </>
      )}

      {/* Upload / URL modal */}
      <Dialog open={uploadOpen} onOpenChange={(v) => { if (!uploading && !urlSubmitting) resetAndClose(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>📎 Ajouter une preuve</DialogTitle>
            <p className="text-xs text-muted-foreground">Extrant : [{extrantRef}]</p>
          </DialogHeader>

          <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as "fichier" | "url")}>
            <TabsList className="w-full">
              <TabsTrigger value="fichier" className="flex-1">📄 Fichier</TabsTrigger>
              <TabsTrigger value="url" className="flex-1">🔗 Lien URL</TabsTrigger>
            </TabsList>

            <div className="space-y-4 mt-4">
              <div className="space-y-1">
                <Label className="text-sm">Libellé de la preuve *</Label>
                <Input
                  value={libelle}
                  onChange={(e) => setLibelle(e.target.value)}
                  placeholder={uploadMode === "url" ? "Ex : Post Facebook campagne EFO janvier 2026" : "Ex : Plan marketing 2026 approuvé"}
                  disabled={uploading || urlSubmitting}
                />
              </div>

              <TabsContent value="fichier" className="mt-0">
                <div className="space-y-1">
                  <Label className="text-sm">Fichier *</Label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                  >
                    <Paperclip className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Glisser-déposer ou cliquer</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, XLSX, JPG, PNG — max 50 Mo</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_EXTENSIONS}
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  />
                  {fileError && <p className="text-xs text-destructive">❌ {fileError}</p>}
                  {file && !fileError && (
                    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded text-xs">
                      {getFileIcon(file.type)}
                      <span className="text-foreground">{file.name}</span>
                      <span className="text-muted-foreground">— {formatFileSize(file.size)}</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto" onClick={() => setFile(null)}>✕</Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="url" className="mt-0">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-sm">URL du lien *</Label>
                    <Input
                      type="url"
                      value={urlLien}
                      onChange={(e) => setUrlLien(e.target.value)}
                      placeholder="https://www.facebook.com/..."
                      disabled={urlSubmitting}
                      className={urlLien ? (urlValid ? "border-green-500 focus-visible:ring-green-500" : "border-destructive focus-visible:ring-destructive") : ""}
                    />
                    {urlLien && !urlValid && (
                      <p className="text-xs text-destructive">⚠️ URL invalide — doit commencer par https:// ou http://</p>
                    )}
                  </div>

                  {/* Platform detection preview */}
                  {urlLien && urlValid && urlPlatform && (
                    <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${urlPlatform.bgClass}`}>
                      <span className="text-lg">{urlPlatform.icon}</span>
                      <span className="text-sm font-semibold" style={{ color: urlPlatform.color }}>{urlPlatform.label}</span>
                      <span className="text-xs text-green-600 ml-auto font-medium">✓ Lien valide</span>
                    </div>
                  )}
                </div>
              </TabsContent>

              <div className="space-y-1">
                <Label className="text-sm">Observations (optionnel)</Label>
                <Textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={2} disabled={uploading || urlSubmitting} />
              </div>

              {uploading && (
                <div className="space-y-1">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">{uploadProgress}%</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetAndClose} disabled={uploading || urlSubmitting}>Annuler</Button>
                {uploadMode === "fichier" ? (
                  <Button onClick={handleUpload} disabled={uploading || !file || !libelle.trim()}>
                    {uploading ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Dépôt en cours... {uploadProgress}%</>
                    ) : (
                      <><Paperclip className="h-3.5 w-3.5 mr-1" /> Déposer la preuve</>
                    )}
                  </Button>
                ) : (
                  <Button onClick={handleAddUrl} disabled={urlSubmitting || !urlValid || !libelle.trim()}>
                    {urlSubmitting ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Ajout en cours...</>
                    ) : (
                      <><LinkIcon className="h-3.5 w-3.5 mr-1" /> Ajouter le lien</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PreuvesTab;
