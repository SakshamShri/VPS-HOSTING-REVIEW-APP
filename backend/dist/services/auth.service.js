"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const db_1 = require("../utils/db");
const jwt_1 = require("../utils/jwt");
const password_1 = require("../utils/password");
function generateOtp() {
    // Simple 6-digit numeric OTP for demo purposes.
    return Math.floor(100000 + Math.random() * 900000).toString();
}
class AuthService {
    async adminLogin(input) {
        const admin = await db_1.prisma.adminCredentials.findUnique({
            where: { username: input.username },
        });
        if (!admin || !admin.is_active) {
            const err = new Error("INVALID_CREDENTIALS");
            err.code = "INVALID_CREDENTIALS";
            throw err;
        }
        const ok = await (0, password_1.verifyPassword)(input.password, admin.password_hash);
        if (!ok) {
            const err = new Error("INVALID_CREDENTIALS");
            err.code = "INVALID_CREDENTIALS";
            throw err;
        }
        const token = (0, jwt_1.signToken)(admin.id, admin.role);
        return { token, role: admin.role };
    }
    async sendOtp(input) {
        // For development we keep a fixed OTP for a specific test number to simplify flows.
        const otp = input.mobile === "9680105678" ? "1234" : generateOtp();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await db_1.prisma.otpSession.create({
            data: {
                mobile: input.mobile,
                otp,
                expires_at: expiresAt,
            },
        });
        // In a real system we would send SMS. For now we just return it for dev/testing.
        return { otp };
    }
    async verifyOtp(input) {
        const session = await db_1.prisma.otpSession.findFirst({
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
            err.code = "INVALID_OTP";
            throw err;
        }
        await db_1.prisma.otpSession.update({
            where: { id: session.id },
            data: { verified: true },
        });
        let user = await db_1.prisma.user.findFirst({ where: { mobile: input.mobile } });
        if (!user) {
            user = await db_1.prisma.user.create({
                data: {
                    mobile: input.mobile,
                    role: "USER",
                },
            });
        }
        const token = (0, jwt_1.signToken)(user.id, user.role);
        return { token, user };
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
