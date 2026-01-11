import { redirect } from "next/navigation";
import { isAdminSessionValid } from "@/lib/admin/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if admin session is valid (cookie-based)
  const isValid = await isAdminSessionValid();

  if (!isValid) {
    // No valid admin session - redirect to login
    redirect("/login");
  }

  return <>{children}</>;
}
