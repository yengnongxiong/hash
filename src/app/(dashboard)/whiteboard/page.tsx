import { createClient } from "@/lib/supabase/server";
import { Whiteboard } from "@/components/dashboard/whiteboard";

export default async function WhiteboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user?.id || "")
    .single();

  const { data: tasks, error } = await supabase
    .from("whiteboard_tasks")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">Error loading tasks: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Whiteboard</h1>
        <p className="text-muted-foreground">
          Collaborate in real-time with your team. Drag tasks between columns.
        </p>
      </div>

      <Whiteboard
        initialTasks={tasks || []}
        organizationId={userData?.organization_id || ""}
      />
    </div>
  );
}
