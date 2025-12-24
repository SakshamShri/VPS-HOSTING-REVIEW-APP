"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = exports.UserService = void 0;
const identity_1 = require("../utils/identity");
const user_repository_1 = require("../repositories/user.repository");
class UserService {
    async verifyIdentity(userId, country, idNumber) {
        const trimmed = idNumber.trim();
        let valid = false;
        if (country === "INDIA") {
            valid = (0, identity_1.isValidAadhaar)(trimmed);
        }
        else if (country === "BRAZIL") {
            valid = (0, identity_1.isValidCpf)(trimmed);
        }
        if (!valid) {
            const error = new Error("INVALID_ID_NUMBER");
            error.code = "INVALID_ID_NUMBER";
            throw error;
        }
        await user_repository_1.userRepository.setIdentityVerified(userId);
    }
    async saveProfile(userId, input) {
        if (!input.name || !input.age) {
            const error = new Error("INVALID_PROFILE");
            error.code = "INVALID_PROFILE";
            throw error;
        }
        await user_repository_1.userRepository.upsertProfile(userId, input);
        const user = await user_repository_1.userRepository.findById(userId);
        if (!user) {
            const error = new Error("USER_NOT_FOUND");
            error.code = "USER_NOT_FOUND";
            throw error;
        }
        if (user.identity_verified && !user.is_verified) {
            await user_repository_1.userRepository.setIsVerified(userId, true);
            return { isVerified: true };
        }
        return { isVerified: user.is_verified };
    }
}
exports.UserService = UserService;
exports.userService = new UserService();
