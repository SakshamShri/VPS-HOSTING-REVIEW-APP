import type { NextFunction, Request, Response } from "express";

import { verifyToken } from "../utils/jwt";
import type { AuthRole, JwtPayload } from "../types/auth.types";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: bigint;
    role: AuthRole;
    raw: JwtPayload;
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.slice("Bearer ".length);
  try {
    const payload = verifyToken(token);
    const idBigInt = BigInt(payload.userId);
    req.user = {
      id: idBigInt,
      role: payload.role,
      raw: payload,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.user.role === "SUPER_ADMIN" || req.user.role === "ADMIN") {
      return next();
    }
    return res.status(403).json({ message: "Forbidden" });
  });
}

export function requireUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // Allow any authenticated account (USER, ADMIN, SUPER_ADMIN) to access user routes.
    // This keeps the UX simple while still requiring a valid JWT.
    if (req.user.role === "USER" || req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN") {
      return next();
    }
    return res.status(403).json({ message: "Forbidden" });
  });
}
