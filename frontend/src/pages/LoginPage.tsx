import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { adminLogin } from "../api/auth.api";
import { firebaseLogin } from "../api/firebaseAuth.api";
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from "../lib/firebase";
import type { ConfirmationResult } from "firebase/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"admin" | "user">("admin");

  // Admin login state
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  // User OTP login state
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [otpLoading, setOtpLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const [error, setError] = useState<string | null>(null);

  const handleAdminLogin = async () => {
    setAdminLoading(true);
    setError(null);
    try {
      const { token, role } = await adminLogin({
        username: adminUsername,
        password: adminPassword,
      });
      localStorage.setItem("authToken", token);
      localStorage.setItem("authRole", role);
      localStorage.setItem("adminAuthToken", token);
      localStorage.setItem("adminAuthRole", role);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to login");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleOtpSend = async () => {
    if (!mobile.trim()) {
      setError("Please enter a mobile number");
      return;
    }

    setOtpLoading(true);
    setError(null);
    try {
      const digitsOnly = mobile.replace(/\D/g, "");
      const phoneNumber = mobile.trim().startsWith("+")
        ? mobile.trim()
        : `+91${digitsOnly}`;

      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }

      // Use the hidden recaptcha container div as the anchor for invisible reCAPTCHA.
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });

      await recaptchaVerifierRef.current.render();

      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifierRef.current);
      setConfirmationResult(confirmation);
      setOtpStep("verify");
    } catch (err) {
      console.error(err);
      const anyErr = err as any;
      setError(anyErr?.message || anyErr?.code || "Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    if (!otp.trim()) {
      setError("Please enter the OTP");
      return;
    }

    setOtpLoading(true);
    setError(null);
    try {
      if (!confirmationResult) {
        throw new Error("Please request OTP again");
      }

      const result = await confirmationResult.confirm(otp);
      const idToken = await result.user.getIdToken();

      const { token, role, identityVerified, isVerified } = await firebaseLogin(idToken);
      localStorage.setItem("authToken", token);
      localStorage.setItem("authRole", role);
      if (isVerified) {
        navigate("/user/home", { replace: true });
      } else if (identityVerified) {
        navigate("/user/profile", { replace: true });
      } else {
        navigate("/user/verify", { replace: true });
      }
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to verify OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted px-4 py-8">
      {/* Firebase reCAPTCHA container (invisible) */}
      <div
        id="recaptcha-container"
        style={{ position: "absolute", left: "-10000px", top: "-10000px" }}
      />

      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Sign in</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose how you want to continue.
          </p>
        </div>

        <div className="mb-4 inline-flex w-full rounded-lg border bg-card p-1 text-xs font-medium text-muted-foreground">
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${
              mode === "admin" ? "bg-foreground text-background" : "hover:bg-muted"
            }`}
            onClick={() => {
              setMode("admin");
              setError(null);
            }}
          >
            Admin
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${
              mode === "user" ? "bg-foreground text-background" : "hover:bg-muted"
            }`}
            onClick={() => {
              setMode("user");
              setError(null);
            }}
          >
            User (OTP)
          </button>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {mode === "admin" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-username">Username</Label>
                <Input
                  id="admin-username"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="Admin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button
                className="w-full"
                size="sm"
                disabled={adminLoading}
                onClick={() => void handleAdminLogin()}
              >
                {adminLoading ? "Signing in…" : "Sign in as admin"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile number</Label>
                <Input
                  id="mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. 9876543210 or +91 98765 43210"
                  disabled={otpStep === "verify"}
                />
              </div>

              {otpStep === "verify" && (
                <div className="space-y-2">
                  <Label htmlFor="otp">OTP</Label>
                  <Input
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter the code you received"
                  />
                </div>
              )}

              {otpStep === "request" ? (
                <Button
                  className="w-full"
                  size="sm"
                  disabled={otpLoading}
                  onClick={() => void handleOtpSend()}
                >
                  {otpLoading ? "Sending…" : "Send OTP"}
                </Button>
              ) : (
                <Button
                  className="w-full"
                  size="sm"
                  disabled={otpLoading}
                  onClick={() => void handleOtpVerify()}
                >
                  {otpLoading ? "Verifying…" : "Verify & continue"}
                </Button>
              )}
            </div>
          )}

          {error && <p className="mt-4 text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}
