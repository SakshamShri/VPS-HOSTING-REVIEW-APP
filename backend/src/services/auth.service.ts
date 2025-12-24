import type { AdminCredentials, User } from "@prisma/client";

import { prisma } from "../utils/db";
import { signToken } from "../utils/jwt";
import { verifyPassword } from "../utils/password";
import type {
  AdminLoginInput,
  AuthRole,
  OtpSendInput,
  OtpVerifyInput,
} from "../types/auth.types";

function generateOtp(): string {
  // Simple 6-digit numeric OTP for demo purposes.
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export class AuthService {
  async adminLogin(input: AdminLoginInput): Promise<{ token: string; role: AuthRole }> {
    const admin = await prisma.adminCredentials.findUnique({
      where: { username: input.username },
    });

    if (!admin || !admin.is_active) {
      const err = new Error("INVALID_CREDENTIALS");
      (err as any).code = "INVALID_CREDENTIALS";
      throw err;
    }

    const ok = await verifyPassword(input.password, admin.password_hash);
    if (!ok) {
      const err = new Error("INVALID_CREDENTIALS");
      (err as any).code = "INVALID_CREDENTIALS";
      throw err;
    }

    const token = signToken(admin.id, admin.role as AuthRole);
    return { token, role: admin.role as AuthRole };
  }

  async sendOtp(input: OtpSendInput): Promise<{ otp: string }> {
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.otpSession.create({
      data: {
        mobile: input.mobile,
        otp,
        expires_at: expiresAt,
      },
    });

    // In a real system we would send SMS. For now we just return it for dev/testing.
    return { otp };
  }

  async verifyOtp(input: OtpVerifyInput): Promise<{ token: string; user: User }> {
    const session = await prisma.otpSession.findFirst({
      where: {
        mobile: input.mobile,
        otp: input.otp,
        verified: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: "desc" },
    });

    if (!session) {
      const err = new Error("INVALID_OTP");
      (err as any).code = "INVALID_OTP";
      throw err;
    }

    await prisma.otpSession.update({
      where: { id: session.id },
      data: { verified: true },
    });

    let user = await prisma.user.findFirst({ where: { mobile: input.mobile } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          mobile: input.mobile,
          role: "USER",
        },
      });
    }

    const token = signToken(user.id, user.role as AuthRole);
    return { token, user };
  }
}

export const authService = new AuthService();
