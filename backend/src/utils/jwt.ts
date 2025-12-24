import jwt from "jsonwebtoken";

import type { AuthRole, JwtPayload } from "../types/auth.types";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
// Default token lifetime: 7 days. Can be overridden via JWT_EXPIRES_IN env var.
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export function signToken(userId: bigint, role: AuthRole): string {
  const payload: JwtPayload = {
    userId: userId.toString(),
    role,
  };
  return (jwt as any).sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET);
  // jsonwebtoken can return string | object, we expect an object
  if (!decoded || typeof decoded !== "object" || !("userId" in decoded) || !("role" in decoded)) {
    throw new Error("INVALID_TOKEN");
  }
  return decoded as JwtPayload;
}
