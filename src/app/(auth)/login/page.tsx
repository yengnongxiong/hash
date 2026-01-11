"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login, resendConfirmation } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, RefreshCw } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [isResending, startResendTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);
    setUnconfirmedEmail(null);
    setLoading(true);

    const result = await login(formData);

    if (result?.redirectTo) {
      // Admin users need to use admin login portal
      toast.info(result.error);
      router.push(result.redirectTo);
      return;
    } else if (result?.error === "EMAIL_NOT_CONFIRMED") {
      setUnconfirmedEmail(result.email || null);
      setError(result.message || "Please confirm your email before logging in.");
      setLoading(false);
    } else if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // Successful login redirects server-side
  }

  function handleResend() {
    if (!unconfirmedEmail) return;

    startResendTransition(async () => {
      const result = await resendConfirmation(unconfirmedEmail);
      if (result.success) {
        toast.success("Confirmation email sent! Check your inbox.");
      } else {
        toast.error(result.error || "Failed to resend confirmation email");
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            Sign in to your Hash account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            {error && (
              <div className="space-y-3">
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
                {unconfirmedEmail && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleResend}
                    disabled={isResending}
                  >
                    {isResending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Resend confirmation email
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
