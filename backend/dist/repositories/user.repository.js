"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = exports.UserRepository = void 0;
const db_1 = require("../utils/db");
class UserRepository {
    async findById(id) {
        return db_1.prisma.user.findUnique({ where: { id } });
    }
    async upsertProfile(userId, input) {
        return db_1.prisma.userProfile.upsert({
            where: { user_id: userId },
            create: {
                user_id: userId,
                name: input.name,
                age: input.age,
                address: input.address ?? null,
                current_location: input.current_location ?? null,
                permanent_address: input.permanent_address ?? null,
            },
            update: {
                name: input.name,
                age: input.age,
                address: input.address ?? null,
                current_location: input.current_location ?? null,
                permanent_address: input.permanent_address ?? null,
            },
        });
    }
    async setIdentityVerified(userId) {
        await db_1.prisma.user.update({
            where: { id: userId },
            data: { identity_verified: true },
        });
    }
    async setIsVerified(userId, isVerified) {
        await db_1.prisma.user.update({
            where: { id: userId },
            data: { is_verified: isVerified },
        });
    }
}
exports.UserRepository = UserRepository;
exports.userRepository = new UserRepository();
