import { redirect } from "next/navigation";
import { isAdminSessionValid } from "@/lib/admin/auth";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if admin has valid 2FA session
  const hasValidSession = await isAdminSessionValid();

  if (!hasValidSession) {
    // Need 2FA verification
    redirect("/admin/verify");
  }

  return <>{children}</>;
}
