import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCheck, Bell, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const Notifications = () => {
  const { data: notifications = [], isLoading, markRead, markAllRead, unreadCount } = useNotifications();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
            <CheckCheck className="h-4 w-4 mr-1" />Tout marquer comme lu ({unreadCount})
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucune notification pour le moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <Card
              key={n.id}
              className={`cursor-pointer hover:shadow-md transition ${!n.lue ? "border-primary/30 bg-accent/20" : ""}`}
              onClick={() => {
                if (!n.lue) markRead.mutate(n.id);
                if (n.lien) navigate(n.lien);
              }}
            >
              <CardContent className="py-3 flex items-start gap-3">
                <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${!n.lue ? "bg-primary" : "bg-transparent"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{n.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(n.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                    </span>
                    <Badge variant="outline" className="text-[10px]">{n.type}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
