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

  const organizationId = userData?.organization_id || "";

  // Fetch tasks and team members in parallel
  const [tasksResult, membersResult] = await Promise.all([
    supabase
      .from("whiteboard_tasks")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true }),
    supabase
      .from("users")
      .select("id, name, email")
      .eq("organization_id", organizationId)
      .order("name"),
  ]);

  if (tasksResult.error) {
    return (
      <div className="p-6">
        <p className="text-destructive">Error loading tasks: {tasksResult.error.message}</p>
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
        initialTasks={tasksResult.data || []}
        organizationId={organizationId}
        teamMembers={membersResult.data || []}
      />
    </div>
  );
}
