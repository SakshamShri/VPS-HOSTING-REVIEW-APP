import type { User, UserProfile } from "@prisma/client";

import { prisma } from "../utils/db";
import type { UserProfileInput } from "../types/auth.types";

export class UserRepository {
  async findById(id: bigint): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async upsertProfile(userId: bigint, input: UserProfileInput): Promise<UserProfile> {
    return prisma.userProfile.upsert({
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

  async setIdentityVerified(userId: bigint): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { identity_verified: true },
    });
  }

  async setIsVerified(userId: bigint, isVerified: boolean): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { is_verified: isVerified },
    });
  }
}

export const userRepository = new UserRepository();
