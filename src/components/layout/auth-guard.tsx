"use client";

import { useEffect, useLayoutEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AuthGuard() {
  const router = useRouter();
  const pathname = usePathname();

  // Use layoutEffect for synchronous check before paint
  useLayoutEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // User is not authenticated, redirect to login immediately
        window.location.replace("/login");
      }
    };

    // Check immediately on mount/navigation
    checkAuth();
  }, [pathname]);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Use window.location for hard redirect to bypass any caching
        window.location.replace("/login");
      }
    };

    // Also check when page becomes visible (handles bfcache)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAuth();
      }
    };

    // Handle pageshow event - check on ANY pageshow, not just persisted
    const handlePageShow = () => {
      checkAuth();
    };

    // Handle popstate (back/forward button)
    const handlePopState = () => {
      checkAuth();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [router]);

  return null;
}
