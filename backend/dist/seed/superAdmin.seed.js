"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedSuperAdmin = seedSuperAdmin;
const db_1 = require("../utils/db");
const password_1 = require("../utils/password");
const SUPER_ADMIN_USERNAME = "Admin";
const SUPER_ADMIN_PASSWORD = "1234";
async function seedSuperAdmin() {
    const existing = await db_1.prisma.adminCredentials.findUnique({
        where: { username: SUPER_ADMIN_USERNAME },
    });
    if (existing) {
        return;
    }
    const password_hash = await (0, password_1.hashPassword)(SUPER_ADMIN_PASSWORD);
    await db_1.prisma.adminCredentials.create({
        data: {
            username: SUPER_ADMIN_USERNAME,
            password_hash,
            role: "SUPER_ADMIN",
            is_active: true,
        },
    });
}
