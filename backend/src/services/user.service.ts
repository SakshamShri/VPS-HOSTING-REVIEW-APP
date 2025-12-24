import type { AuthCountry, UserProfileInput } from "../types/auth.types";
import { isValidAadhaar, isValidCpf } from "../utils/identity";
import { userRepository } from "../repositories/user.repository";

export class UserService {
  async verifyIdentity(userId: bigint, country: AuthCountry, idNumber: string): Promise<void> {
    const trimmed = idNumber.trim();
    let valid = false;

    if (country === "INDIA") {
      valid = isValidAadhaar(trimmed);
    } else if (country === "BRAZIL") {
      valid = isValidCpf(trimmed);
    }

    if (!valid) {
      const error = new Error("INVALID_ID_NUMBER");
      (error as any).code = "INVALID_ID_NUMBER";
      throw error;
    }

    await userRepository.setIdentityVerified(userId);
  }

  async saveProfile(userId: bigint, input: UserProfileInput): Promise<{ isVerified: boolean }> {
    if (!input.name || !input.age) {
      const error = new Error("INVALID_PROFILE");
      (error as any).code = "INVALID_PROFILE";
      throw error;
    }

    await userRepository.upsertProfile(userId, input);

    const user = await userRepository.findById(userId);
    if (!user) {
      const error = new Error("USER_NOT_FOUND");
      (error as any).code = "USER_NOT_FOUND";
      throw error;
    }

    if (user.identity_verified && !user.is_verified) {
      await userRepository.setIsVerified(userId, true);
      return { isVerified: true };
    }

    return { isVerified: user.is_verified };
  }
}

export const userService = new UserService();
