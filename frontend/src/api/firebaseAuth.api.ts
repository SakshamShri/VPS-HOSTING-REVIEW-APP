interface FirebaseLoginResponse {
  token: string;
  role: string;
  userId: string;
  identityVerified: boolean;
  isVerified: boolean;
}

export async function firebaseLogin(idToken: string): Promise<FirebaseLoginResponse> {
  const API_BASE =
    (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:4000";

  const res = await fetch(`${API_BASE}/auth/firebase-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Firebase login failed');
  }

  return res.json();
}
