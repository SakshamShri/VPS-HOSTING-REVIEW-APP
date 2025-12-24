"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signToken = signToken;
exports.verifyToken = verifyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
// Default token lifetime: 7 days. Can be overridden via JWT_EXPIRES_IN env var.
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
function signToken(userId, role) {
    const payload = {
        userId: userId.toString(),
        role,
    };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
function verifyToken(token) {
    const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
    // jsonwebtoken can return string | object, we expect an object
    if (!decoded || typeof decoded !== "object" || !("userId" in decoded) || !("role" in decoded)) {
        throw new Error("INVALID_TOKEN");
    }
    return decoded;
}
