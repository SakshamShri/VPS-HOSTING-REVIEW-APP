"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
exports.requireUser = requireUser;
const jwt_1 = require("../utils/jwt");
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const token = authHeader.slice("Bearer ".length);
    try {
        const payload = (0, jwt_1.verifyToken)(token);
        const idBigInt = BigInt(payload.userId);
        req.user = {
            id: idBigInt,
            role: payload.role,
            raw: payload,
        };
        return next();
    }
    catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
}
function requireAdmin(req, res, next) {
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
function requireUser(req, res, next) {
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
