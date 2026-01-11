"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Shield, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { sendAdminCode, verifyAdminCode } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/client";

export default function AdminVerifyPage() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Handle back button - sign out and go to login
  useEffect(() => {
    window.history.replaceState(null, "", "/admin/verify");
    window.history.pushState(null, "", "/admin/verify");

    const handlePopState = async () => {
      // Sign out to clear the Supabase session
      const supabase = createClient();
      await supabase.auth.signOut();
      // Use window.location for hard redirect to bypass proxy
      window.location.href = "/login";
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    setIsSending(true);
    const result = await sendAdminCode();
    setIsSending(false);

    if (result.success) {
      setCodeSent(true);
      setCountdown(60); // 60 second cooldown
      toast.success("Verification code sent to your email");
      // Focus first input
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } else {
      toast.error(result.error || "Failed to send verification code");
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (value && index === 5) {
      const fullCode = newCode.join("");
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData.length === 6) {
      const newCode = pastedData.split("");
      setCode(newCode);
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (fullCode: string) => {
    setIsLoading(true);
    const result = await verifyAdminCode(fullCode);
    setIsLoading(false);

    if (result.success) {
      toast.success("Verification successful");
      router.push("/admin");
      router.refresh();
    } else {
      toast.error(result.error || "Invalid verification code");
      // Clear code and focus first input
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Admin Verification</CardTitle>
          <CardDescription>
            {codeSent
              ? "Enter the 6-digit code sent to your email"
              : "Verify your identity to access the admin panel"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!codeSent ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                We&apos;ll send a verification code to your admin email address.
              </p>
              <Button
                onClick={handleSendCode}
                className="w-full"
                disabled={isSending}
              >
                {isSending ? (
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
            </div>
          ) : (
            <div className="space-y-6">
              {/* Code input boxes */}
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-mono"
                    disabled={isLoading}
                  />
                ))}
              </div>

              {/* Verify button */}
              <Button
                onClick={() => handleVerify(code.join(""))}
                className="w-full"
                disabled={isLoading || code.join("").length !== 6}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Code"
                )}
              </Button>

              {/* Resend code */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Didn&apos;t receive the code?
                </p>
                <Button
                  variant="link"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || isSending}
                  className="p-0 h-auto"
                >
                  {countdown > 0 ? (
                    `Resend in ${countdown}s`
                  ) : isSending ? (
                    "Sending..."
                  ) : (
                    "Resend code"
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
