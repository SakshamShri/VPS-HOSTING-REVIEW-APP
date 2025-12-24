import type { AuthRole } from "../../backend/src/types/auth.types";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:4000";

export interface AdminLoginPayload {
  username: string;
  password: string;
}

export async function adminLogin(payload: AdminLoginPayload): Promise<{
  token: string;
  role: AuthRole;
}> {
  const res = await fetch(`${API_BASE}/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `Failed to login: ${res.status}`);
  }

  const data = (await res.json()) as { token: string; role: AuthRole };
  return data;
}

export async function sendOtp(mobile: string): Promise<{ sent: boolean; otp?: string }> {
  const res = await fetch(`${API_BASE}/auth/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `Failed to send OTP: ${res.status}`);
  }

  return (await res.json()) as { sent: boolean; otp?: string };
}

export async function verifyOtp(mobile: string, otp: string): Promise<{
  token: string;
  role: AuthRole;
  userId: string;
  identityVerified?: boolean;
  isVerified?: boolean;
}> {
  const res = await fetch(`${API_BASE}/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile, otp }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `Failed to verify OTP: ${res.status}`);
  }

  return (await res.json()) as {
    token: string;
    role: AuthRole;
    userId: string;
    identityVerified?: boolean;
    isVerified?: boolean;
  };
}
