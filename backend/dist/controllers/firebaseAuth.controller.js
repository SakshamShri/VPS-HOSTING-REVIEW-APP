"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.firebaseLoginHandler = firebaseLoginHandler;
const firebaseAdmin_1 = require("../lib/firebaseAdmin");
const db_1 = require("../utils/db");
const jwt_1 = require("../utils/jwt");
const zod_1 = require("zod");
const firebaseLoginSchema = zod_1.z.object({
    idToken: zod_1.z.string()
});
async function firebaseLoginHandler(req, res) {
    try {
        const { idToken } = firebaseLoginSchema.parse(req.body);
        // Verify the Firebase ID token
        const decodedToken = await firebaseAdmin_1.firebaseAdmin.verifyIdToken(idToken);
        const phoneNumber = decodedToken.phone_number;
        if (!phoneNumber) {
            return res.status(400).json({ message: 'No phone number in token' });
        }
        // Find or create user in your database
        let user = await db_1.prisma.user.findFirst({
            where: { mobile: phoneNumber }
        });
        if (!user) {
            // Create new user if not exists
            user = await db_1.prisma.user.create({
                data: {
                    mobile: phoneNumber,
                    role: 'USER',
                },
            });
        }
        // Generate your app's JWT
        const token = (0, jwt_1.signToken)(user.id, user.role);
        return res.status(200).json({
            token,
            role: user.role,
            userId: String(user.id),
            identityVerified: user.identity_verified ?? false,
            isVerified: user.is_verified ?? false,
        });
    }
    catch (error) {
        console.error('Firebase login error:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                message: 'Invalid request',
                issues: error.errors
            });
        }
        if (error.code === 'auth/argument-error') {
            return res.status(401).json({
                message: 'Invalid or expired token'
            });
        }
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}
