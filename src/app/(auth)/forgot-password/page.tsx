"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, ArrowLeft, RefreshCw, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for resend
  useState(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    const result = await sendPasswordResetEmail(email);

    if (result.success) {
      setEmailSent(true);
      setCountdown(60);
      toast.success("Password reset email sent");
    } else {
      toast.error(result.error || "Failed to send reset email");
    }

    setIsLoading(false);
  }

  async function handleResend() {
    setIsLoading(true);
    const result = await sendPasswordResetEmail(email);

    if (result.success) {
      setCountdown(60);
      toast.success("Password reset email resent");
    } else {
      toast.error(result.error || "Failed to resend email");
    }

    setIsLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            {emailSent ? (
              <CheckCircle className="h-6 w-6 text-primary" />
            ) : (
              <Mail className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {emailSent ? "Check Your Email" : "Reset Password"}
          </CardTitle>
          <CardDescription>
            {emailSent
              ? "We sent you a password reset link"
              : "Enter your email to receive a password reset link"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!emailSent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reset Link
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  We sent a password reset link to:
                </p>
                <p className="font-medium">{email}</p>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>Click the link in your email to reset your password.</p>
                <p className="mt-1">The link will expire in 1 hour.</p>
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Didn&apos;t receive the email?
                </p>
                <Button
                  variant="outline"
                  onClick={handleResend}
                  disabled={countdown > 0 || isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : countdown > 0 ? (
                    `Resend in ${countdown}s`
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Resend Reset Link
                    </>
                  )}
                </Button>
              </div>

              <Button
                variant="ghost"
                onClick={() => {
                  setEmailSent(false);
                  setEmail("");
                }}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Use different email
              </Button>
            </div>
          )}

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:underline"
            >
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
