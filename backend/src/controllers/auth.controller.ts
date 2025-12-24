import type { Request, Response } from "express";
import { z } from "zod";

import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { userService } from "../services/user.service";
import { authService } from "../services/auth.service";
import { logDeviceLogin } from "../utils/deviceLog";
import type { AuthRole } from "../types/auth.types";
import { prisma } from "../utils/db";

const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const otpSendSchema = z.object({
  mobile: z.string().min(1),
});

const otpVerifySchema = z.object({
  mobile: z.string().min(1),
  otp: z.string().min(1),
});

const verifyIdentitySchema = z.object({
  country: z.enum(["INDIA", "BRAZIL"]),
  id_number: z.string().min(1),
});

export async function adminLoginHandler(req: Request, res: Response) {
  try {
    const parsed = adminLoginSchema.parse(req.body);
    const result = await authService.adminLogin(parsed);
    const admin = await prisma.adminCredentials.findUnique({
      where: { username: parsed.username },
    });
    if (admin) {
      await logDeviceLogin({ req, userId: admin.id, role: admin.role as AuthRole });
    }
    return res.status(200).json({ token: result.token, role: result.role });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid payload", issues: err.errors });
    }

    if ((err as any)?.code === "INVALID_CREDENTIALS") {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function otpSendHandler(req: Request, res: Response) {
  try {
    const parsed = otpSendSchema.parse(req.body);
    const { otp } = await authService.sendOtp(parsed);

    // For development we return OTP; in production this would be omitted.
    return res.status(200).json({ sent: true, otp });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid payload", issues: err.errors });
    }

    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function otpVerifyHandler(req: Request, res: Response) {
  try {
    const parsed = otpVerifySchema.parse(req.body);
    const { token, user } = await authService.verifyOtp(parsed);
    await logDeviceLogin({ req, userId: user.id, role: user.role as AuthRole });

    return res.status(200).json({
      token,
      role: user.role,
      userId: String(user.id),
      identityVerified: (user as any).identity_verified ?? false,
      isVerified: (user as any).is_verified ?? false,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid payload", issues: err.errors });
    }

    if ((err as any)?.code === "INVALID_OTP") {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function verifyIdentityHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = verifyIdentitySchema.parse(req.body);

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await userService.verifyIdentity(req.user.id, parsed.country, parsed.id_number);

    return res.status(200).json({ identity_verified: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid payload", issues: err.errors });
    }

    if ((err as any)?.code === "INVALID_ID_NUMBER") {
      return res.status(400).json({ message: "Invalid identity number" });
    }

    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
