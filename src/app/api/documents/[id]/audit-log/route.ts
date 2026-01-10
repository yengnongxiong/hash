import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 20;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const limit = parseInt(searchParams.get("limit") || String(PAGE_SIZE), 10);

  const supabase = await createClient();

  // Get total count
  const { count } = await supabase
    .from("document_audit_log")
    .select("*", { count: "exact", head: true })
    .eq("document_id", id);

  // Get paginated logs (without relationship join to avoid TypeScript issues)
  const { data: logs, error } = await supabase
    .from("document_audit_log")
    .select("*")
    .eq("document_id", id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!logs || logs.length === 0) {
    return NextResponse.json({
      logs: [],
      total: count || 0,
      hasMore: false,
    });
  }

  // Fetch users separately for logs that have user_id
  const userIds = [...new Set(logs.filter(l => l.user_id).map(l => l.user_id as string))];
  let usersMap: Record<string, { name: string | null; email: string }> = {};

  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", userIds);

    if (users) {
      usersMap = Object.fromEntries(users.map(u => [u.id, { name: u.name, email: u.email }]));
    }
  }

  // Attach users to logs
  const logsWithUsers = logs.map(log => ({
    ...log,
    users: log.user_id ? usersMap[log.user_id] || null : null,
  }));

  return NextResponse.json({
    logs: logsWithUsers,
    total: count || 0,
    hasMore: (offset + limit) < (count || 0),
  });
}
