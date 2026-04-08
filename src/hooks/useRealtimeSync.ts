import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RealtimeSyncOptions {
  table: string;
  queryKeys: (string | string[])[];
  filter?: string;
  schema?: string;
  enabled?: boolean;
}

export function useRealtimeSync({
  table,
  queryKeys,
  filter,
  schema = "public",
  enabled = true,
}: RealtimeSyncOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const channelName = `rt-${table}-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema, table, filter },
        () => {
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({
              queryKey: Array.isArray(key) ? key : [key],
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter, schema, enabled]);
}
