import { useState, useRef } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ChevronDown,
  Upload,
  Download,
  Eye,
  CalendarIcon,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import type { ActiviteGrouped, LivrableRow } from "@/hooks/useLivrablesData";
import { useUploadFile } from "@/hooks/useLivrablesData";

interface Props {
  data: ActiviteGrouped[];
  canMarkProduit: boolean;
  canUpload: boolean;
  onUpdate: (payload: {
    id: string;
    produit?: boolean;
    date_production?: string | null;
    observations?: string | null;
  }) => void;
}

export const LivrablesTable = ({ data, canMarkProduit, canUpload, onUpdate }: Props) => {
  const [openActivites, setOpenActivites] = useState<Set<string>>(new Set());
  const [openTaches, setOpenTaches] = useState<Set<string>>(new Set());
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentLivrableId, setCurrentLivrableId] = useState<string | null>(null);
  const uploadFile = useUploadFile();

  const toggle = (set: Set<string>, id: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setter(next);
  };

  const handleFileSelect = (livrableId: string) => {
    setCurrentLivrableId(livrableId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentLivrableId) return;

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return;
    }

    setUploadingId(currentLivrableId);
    try {
      await uploadFile.mutateAsync({ file, livrableId: currentLivrableId });
    } finally {
      setUploadingId(null);
      setCurrentLivrableId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
        onChange={handleFileChange}
      />
      {data.map((activite) => (
        <Collapsible
          key={activite.id}
          open={openActivites.has(activite.id)}
          onOpenChange={() => toggle(openActivites, activite.id, setOpenActivites)}
        >
          <CollapsibleTrigger className="w-full flex items-center gap-2 p-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition">
            {openActivites.has(activite.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span>{activite.code} — {activite.libelle}</span>
            <Badge variant="outline" className="ml-auto text-primary-foreground border-primary-foreground/30">
              {activite.taches.reduce((s, t) => s + t.livrables.length, 0)} livrables
            </Badge>
          </CollapsibleTrigger>
          <CollapsibleContent className="ml-4 mt-1 space-y-1">
            {activite.taches.map((tache) => (
              <Collapsible
                key={tache.id}
                open={openTaches.has(tache.id)}
                onOpenChange={() => toggle(openTaches, tache.id, setOpenTaches)}
              >
                <CollapsibleTrigger className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm hover:opacity-90 transition">
                  {openTaches.has(tache.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span>{tache.code} — {tache.libelle}</span>
                  <Badge variant="outline" className="ml-auto text-secondary-foreground border-secondary-foreground/30">
                    {tache.livrables.filter((l) => l.produit).length}/{tache.livrables.length}
                  </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="ml-4 mt-1 space-y-1">
                  {tache.livrables.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 pl-2">Aucun livrable enregistré</p>
                  ) : (
                    tache.livrables.map((livrable, idx) => (
                      <LivrableRowComponent
                        key={livrable.id}
                        livrable={livrable}
                        index={idx}
                        canMarkProduit={canMarkProduit}
                        canUpload={canUpload}
                        onUpdate={onUpdate}
                        onUpload={handleFileSelect}
                        isUploading={uploadingId === livrable.id}
                      />
                    ))
                  )}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
};

function LivrableRowComponent({
  livrable,
  index,
  canMarkProduit,
  canUpload,
  onUpdate,
  onUpload,
  isUploading,
}: {
  livrable: LivrableRow;
  index: number;
  canMarkProduit: boolean;
  canUpload: boolean;
  onUpdate: Props["onUpdate"];
  onUpload: (id: string) => void;
  isUploading: boolean;
}) {
  const [obs, setObs] = useState(livrable.observations || "");
  const bgClass = index % 2 === 0 ? "bg-light-blue" : "bg-light-blue-row";

  return (
    <div className={cn("p-3 rounded-lg text-sm space-y-2", bgClass)}>
      <div className="flex items-start gap-3 flex-wrap">
        {/* Checkbox */}
        <div className="flex items-center gap-2 min-w-[140px]">
          {canMarkProduit ? (
            <Checkbox
              checked={livrable.produit ?? false}
              onCheckedChange={(checked) =>
                onUpdate({
                  id: livrable.id,
                  produit: !!checked,
                  date_production: checked ? new Date().toISOString().split("T")[0] : null,
                })
              }
            />
          ) : livrable.produit ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive" />
          )}
          <Badge variant={livrable.produit ? "default" : "destructive"} className="text-xs">
            {livrable.produit ? "Produit" : "Non produit"}
          </Badge>
        </div>

        {/* Libellé */}
        <div className="flex-1 min-w-[200px]">
          <p className="font-medium text-foreground">{livrable.libelle}</p>
        </div>

        {/* Date */}
        <div className="min-w-[160px]">
          {canMarkProduit ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-full justify-start text-left text-xs", !livrable.date_production && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {livrable.date_production
                    ? format(new Date(livrable.date_production), "dd MMM yyyy", { locale: fr })
                    : "Date production"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={livrable.date_production ? new Date(livrable.date_production) : undefined}
                  onSelect={(d) =>
                    d && onUpdate({ id: livrable.id, date_production: d.toISOString().split("T")[0] })
                  }
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          ) : (
            <span className="text-xs text-muted-foreground">
              {livrable.date_production
                ? format(new Date(livrable.date_production), "dd MMM yyyy", { locale: fr })
                : "—"}
            </span>
          )}
        </div>

        {/* File actions */}
        <div className="flex items-center gap-1">
          {canUpload && (
            <Button variant="outline" size="sm" onClick={() => onUpload(livrable.id)} disabled={isUploading}>
              {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            </Button>
          )}
          {livrable.fichier_url && (
            <>
              <Button variant="outline" size="sm" asChild>
                <a href={livrable.fichier_url} target="_blank" rel="noopener noreferrer">
                  <Eye className="h-3 w-3" />
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={livrable.fichier_url} download>
                  <Download className="h-3 w-3" />
                </a>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Observations */}
      {canMarkProduit && (
        <div className="flex gap-2 items-end">
          <Textarea
            placeholder="Observations..."
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            className="text-xs h-8 min-h-[32px] bg-background/50"
            rows={1}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdate({ id: livrable.id, observations: obs })}
            className="text-xs"
          >
            OK
          </Button>
        </div>
      )}
    </div>
  );
}
