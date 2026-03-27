import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface Alert {
  type: "critical" | "warning";
  actCode: string;
  stCode: string;
  description: string;
}

interface Props {
  alerts: Alert[];
}

const AlertPanel = ({ alerts }: Props) => {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground">Alertes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune alerte en cours.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning-foreground" />
          Alertes ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="space-y-0">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 px-4 py-3 border-b last:border-b-0 ${
                  alert.type === "critical"
                    ? "bg-destructive/5"
                    : "bg-warning/10"
                }`}
              >
                {alert.type === "critical" ? (
                  <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-warning-foreground shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-mono text-muted-foreground">
                    {alert.actCode} → {alert.stCode}
                  </p>
                  <p className={`text-sm ${alert.type === "critical" ? "text-destructive" : "text-warning-foreground"}`}>
                    {alert.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AlertPanel;
