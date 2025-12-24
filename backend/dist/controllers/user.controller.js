"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveProfileHandler = saveProfileHandler;
const zod_1 = require("zod");
const user_service_1 = require("../services/user.service");
const profileSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    age: zod_1.z.coerce.number().int().min(0).max(120),
    address: zod_1.z.string().optional(),
    current_location: zod_1.z.string().optional(),
    permanent_address: zod_1.z.string().optional(),
});
async function saveProfileHandler(req, res) {
    try {
        const parsed = profileSchema.parse(req.body);
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const result = await user_service_1.userService.saveProfile(req.user.id, parsed);
        return res.status(200).json({ is_verified: result.isVerified });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: "Invalid payload", issues: err.errors });
        }
        if (err?.code === "INVALID_PROFILE") {
            return res.status(400).json({ message: "Invalid profile" });
        }
        if (err?.code === "USER_NOT_FOUND") {
            return res.status(404).json({ message: "User not found" });
        }
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}
