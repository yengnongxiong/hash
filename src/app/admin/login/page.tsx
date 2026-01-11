"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Mail, RefreshCw, ArrowLeft } from "lucide-react";
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { sendAdminOTP, verifyAdminOTP, getAdminEmailForLogin } from "./actions";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    getAdminEmailForLogin().then(setAdminEmail);
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    const result = await sendAdminOTP(email);

    if (result.success) {
      setStep("otp");
      setCountdown(60);
      toast.success("Verification code sent to your email");
    } else {
      toast.error(result.error || "Failed to send verification code");
    }

    setIsLoading(false);
  }

  async function handleVerifyOTP(value: string) {
    if (value.length !== 6) return;

    setIsLoading(true);
    const result = await verifyAdminOTP(email, value);

    if (result.success) {
      toast.success("Admin access granted");
      router.push("/admin");
      router.refresh();
    } else {
      toast.error(result.error || "Invalid verification code");
      setCode("");
    }

    setIsLoading(false);
  }

  async function handleResendCode() {
    setIsLoading(true);
    const result = await sendAdminOTP(email);

    if (result.success) {
      setCountdown(60);
      setCode("");
      toast.success("New code sent to your email");
    } else {
      toast.error(result.error || "Failed to send code");
    }

    setIsLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
          <CardDescription>
            {step === "email"
              ? "Enter your admin email to receive a verification code"
              : "Enter the 6-digit code sent to your email"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === "email" ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Admin Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={adminEmail ? `e.g. ${adminEmail.slice(0, 3)}...` : "admin@example.com"}
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
                    Send Verification Code
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(value) => {
                    setCode(value);
                    if (value.length === 6) {
                      handleVerifyOTP(value);
                    }
                  }}
                  disabled={isLoading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                onClick={() => handleVerifyOTP(code)}
                className="w-full"
                disabled={isLoading || code.length !== 6}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Login"
                )}
              </Button>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Didn&apos;t receive the code?
                </p>
                <Button
                  variant="link"
                  onClick={handleResendCode}
                  disabled={countdown > 0 || isLoading}
                  className="p-0 h-auto"
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
                </Button>
              </div>

              <Button
                variant="ghost"
                onClick={() => {
                  setStep("email");
                  setCode("");
                }}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Use different email
              </Button>
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Admin sessions expire after 60 minutes for security.
            </p>
          </div>

          <div className="text-center">
            <Link href="/login" className="text-sm text-muted-foreground hover:underline">
              Back to regular login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
