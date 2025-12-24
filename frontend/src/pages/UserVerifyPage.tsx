import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:4000";

export function UserVerifyPage() {
  const navigate = useNavigate();
  const [country, setCountry] = useState<"INDIA" | "BRAZIL">("INDIA");
  const [idNumber, setIdNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${API_BASE}/auth/verify-identity`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ country, id_number: idNumber }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message || `Verification failed (${res.status})`);
      }

      setSuccess(true);
      navigate("/user/profile", { replace: true });
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold tracking-tight text-foreground">
                Verify your identity
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Optional step to attach a government ID to your account.
              </p>
            </div>
            {success && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase text-emerald-700 border border-emerald-200">
                Identity verified
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <select
                id="country"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none"
                value={country}
                onChange={(e) => setCountry(e.target.value as "INDIA" | "BRAZIL")}
              >
                <option value="INDIA">India (Aadhaar)</option>
                <option value="BRAZIL">Brazil (CPF)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="id-number">
                {country === "INDIA" ? "Aadhaar number" : "CPF number"}
              </Label>
              <Input
                id="id-number"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder={country === "INDIA" ? "12-digit Aadhaar" : "11-digit CPF"}
                inputMode="numeric"
              />
              <p className="text-[11px] text-muted-foreground">
                We validate only the checksum locally. No external APIs are called.
              </p>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex flex-col gap-2 pt-2 sm:flex-row-reverse">
              <Button
                className="w-full sm:w-auto"
                size="sm"
                disabled={loading}
                onClick={() => void handleVerify()}
              >
                {loading ? "Verifying..." : "Verify and continue"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => navigate("/user/home", { replace: true })}
              >
                Skip for now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
