import { createClient } from "@/lib/supabase/client";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type ChangeCallback<T> = (payload: {
  new: T;
  old: T;
  eventType: "INSERT" | "UPDATE" | "DELETE";
}) => void;

export function subscribeToTable<T extends Record<string, unknown>>(
  table: string,
  callback: ChangeCallback<T>
) {
  const supabase = createClient();

  const channel = supabase
    .channel(`${table}_changes`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      (payload: RealtimePostgresChangesPayload<T>) => {
        callback({
          new: payload.new as T,
          old: payload.old as T,
          eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToTasks<T extends Record<string, unknown>>(
  callback: ChangeCallback<T>
) {
  return subscribeToTable<T>("tasks", callback);
}

export function subscribeToActivityLog<T extends Record<string, unknown>>(
  callback: ChangeCallback<T>
) {
  return subscribeToTable<T>("activity_log", callback);
}
