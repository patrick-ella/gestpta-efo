import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Image, FileSpreadsheet, Trash2 } from "lucide-react";
import type { ActiviteGrouped } from "@/hooks/useLivrablesData";
import { useDeleteFile } from "@/hooks/useLivrablesData";

interface Props {
  data: ActiviteGrouped[];
  isAdmin: boolean;
}

const getFileIcon = (url: string) => {
  if (/\.(jpg|jpeg|png)$/i.test(url)) return Image;
  if (/\.xlsx?$/i.test(url)) return FileSpreadsheet;
  return FileText;
};

const getFileName = (url: string) => {
  try {
    return decodeURIComponent(url.split("/").pop() || "fichier");
  } catch {
    return "fichier";
  }
};

export const DocumentArchive = ({ data, isAdmin }: Props) => {
  const deleteFile = useDeleteFile();

  const allDocs = data.flatMap((a) =>
    a.taches.flatMap((t) =>
      t.livrables
        .filter((l) => l.fichier_url)
        .map((l) => ({
          ...l,
          tacheCode: t.code,
          tacheLibelle: t.libelle,
        }))
    )
  );

  if (allDocs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucun document téléversé pour le moment.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {allDocs.map((doc) => {
        const Icon = getFileIcon(doc.fichier_url!);
        const fileName = getFileName(doc.fichier_url!);

        return (
          <Card key={doc.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center gap-2">
                <Icon className="h-8 w-8 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate text-foreground">{fileName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{doc.tacheCode} — {doc.tacheLibelle}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">{doc.libelle}</Badge>
              <div className="flex gap-1 pt-1">
                <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
                  <a href={doc.fichier_url!} download><Download className="h-3 w-3 mr-1" />Télécharger</a>
                </Button>
                {isAdmin && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-xs"
                    onClick={() =>
                      deleteFile.mutate({ livrableId: doc.id, fileUrl: doc.fichier_url! })
                    }
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
