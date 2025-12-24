"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminLoginHandler = adminLoginHandler;
exports.otpSendHandler = otpSendHandler;
exports.otpVerifyHandler = otpVerifyHandler;
exports.verifyIdentityHandler = verifyIdentityHandler;
const zod_1 = require("zod");
const user_service_1 = require("../services/user.service");
const auth_service_1 = require("../services/auth.service");
const deviceLog_1 = require("../utils/deviceLog");
const db_1 = require("../utils/db");
const adminLoginSchema = zod_1.z.object({
    username: zod_1.z.string().min(1),
    password: zod_1.z.string().min(1),
});
const otpSendSchema = zod_1.z.object({
    mobile: zod_1.z.string().min(1),
});
const otpVerifySchema = zod_1.z.object({
    mobile: zod_1.z.string().min(1),
    otp: zod_1.z.string().min(1),
});
const verifyIdentitySchema = zod_1.z.object({
    country: zod_1.z.enum(["INDIA", "BRAZIL"]),
    id_number: zod_1.z.string().min(1),
});
async function adminLoginHandler(req, res) {
    try {
        const parsed = adminLoginSchema.parse(req.body);
        const result = await auth_service_1.authService.adminLogin(parsed);
        const admin = await db_1.prisma.adminCredentials.findUnique({
            where: { username: parsed.username },
        });
        if (admin) {
            await (0, deviceLog_1.logDeviceLogin)({ req, userId: admin.id, role: admin.role });
        }
        return res.status(200).json({ token: result.token, role: result.role });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: "Invalid payload", issues: err.errors });
        }
        if (err?.code === "INVALID_CREDENTIALS") {
            return res.status(401).json({ message: "Invalid username or password" });
        }
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}
async function otpSendHandler(req, res) {
    try {
        const parsed = otpSendSchema.parse(req.body);
        const { otp } = await auth_service_1.authService.sendOtp(parsed);
        // For development we return OTP; in production this would be omitted.
        return res.status(200).json({ sent: true, otp });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: "Invalid payload", issues: err.errors });
        }
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}
async function otpVerifyHandler(req, res) {
    try {
        const parsed = otpVerifySchema.parse(req.body);
        const { token, user } = await auth_service_1.authService.verifyOtp(parsed);
        await (0, deviceLog_1.logDeviceLogin)({ req, userId: user.id, role: user.role });
        return res.status(200).json({
            token,
            role: user.role,
            userId: String(user.id),
            identityVerified: user.identity_verified ?? false,
            isVerified: user.is_verified ?? false,
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: "Invalid payload", issues: err.errors });
        }
        if (err?.code === "INVALID_OTP") {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}
async function verifyIdentityHandler(req, res) {
    try {
        const parsed = verifyIdentitySchema.parse(req.body);
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        await user_service_1.userService.verifyIdentity(req.user.id, parsed.country, parsed.id_number);
        return res.status(200).json({ identity_verified: true });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: "Invalid payload", issues: err.errors });
        }
        if (err?.code === "INVALID_ID_NUMBER") {
            return res.status(400).json({ message: "Invalid identity number" });
        }
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}
