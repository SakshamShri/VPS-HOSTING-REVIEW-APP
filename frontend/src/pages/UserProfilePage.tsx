import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:4000";

export function UserProfilePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [age, setAge] = useState(25);
  const [address, setAddress] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${API_BASE}/user/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name,
          age,
          address,
          current_location: currentLocation,
          permanent_address: permanentAddress,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message || `Failed to save profile (${res.status})`);
      }

      const data = (await res.json()) as { is_verified?: boolean };
      setIsVerified(Boolean(data.is_verified));
      setSavedOnce(true);
      navigate("/user/home", { replace: true });
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold tracking-tight text-foreground">
                Complete your profile
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Share a few basic details so we can personalize your experience.
              </p>
            </div>
            {isVerified && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase text-emerald-700 border border-emerald-200">
                Verified
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="age">Age</Label>
                <span className="text-xs text-muted-foreground">{age} years</span>
              </div>
              <input
                id="age"
                type="range"
                min={18}
                max={100}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="current-location">Current location</Label>
              <Input
                id="current-location"
                value={currentLocation}
                onChange={(e) => setCurrentLocation(e.target.value)}
                placeholder="City, country"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="permanent-address">Permanent address</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPermanentAddress(address)}
                >
                  Same as address
                </Button>
              </div>
              <Textarea
                id="permanent-address"
                value={permanentAddress}
                onChange={(e) => setPermanentAddress(e.target.value)}
                rows={2}
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            {savedOnce && !error && (
              <p className="text-[11px] text-muted-foreground">
                Your profile has been saved. {isVerified ? "You are now verified." : "You can verify your identity anytime from the verification screen."}
              </p>
            )}

            <div className="flex flex-col gap-2 pt-2 sm:flex-row-reverse">
              <Button
                className="w-full sm:w-auto"
                size="sm"
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {saving ? "Saving..." : "Save & Finish"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => navigate(-1)}
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
