import { prisma } from "../utils/db";

export type PsiRatingsInput = {
  trustIntegrity: number;
  performanceDelivery: number;
  responsiveness: number;
  leadershipAbility: number;
};

function parseBigIntId(value: string): bigint {
  try {
    return BigInt(value);
  } catch {
    const err = new Error("INVALID_ID");
    (err as any).code = "INVALID_ID";
    throw err;
  }
}

function clampRating(value: number): number {
  if (Number.isNaN(value)) return 50;
  return Math.min(100, Math.max(0, value));
}

export class PsiService {
  private async getWeightedFactorForUser(userId: bigint): Promise<number> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      const err = new Error("USER_NOT_FOUND");
      (err as any).code = "USER_NOT_FOUND";
      throw err;
    }

    // New user = voted on less than 5 distinct profiles in PSI
    const distinctProfiles = await (prisma as any).psiVote.groupBy({
      by: ["profile_id"],
      where: { user_id: userId },
    });
    const distinctProfilesCount = distinctProfiles.length;
    const isNewUser = distinctProfilesCount < 5;

    if (user.is_verified) {
      // 1. User Verified: vote × 1
      // 4. New Verified User: vote × 1
      return 1;
    }

    // 2. User Unverified: vote × 0.8
    // 3. New Unverified User (<5 profiles): vote × 0.5
    return isNewUser ? 0.5 : 0.8;
  }

  async submitVote(params: { userId: string; profileId: string; ratings: PsiRatingsInput }) {
    const userId = parseBigIntId(params.userId);
    const profileId = parseBigIntId(params.profileId);

    const profile = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile || profile.status !== "ACTIVE") {
      const err = new Error("PROFILE_NOT_FOUND");
      (err as any).code = "PROFILE_NOT_FOUND";
      throw err;
    }

    const weight = await this.getWeightedFactorForUser(userId);

    const trust = clampRating(params.ratings.trustIntegrity);
    const performance = clampRating(params.ratings.performanceDelivery);
    const responsiveness = clampRating(params.ratings.responsiveness);
    const leadership = clampRating(params.ratings.leadershipAbility);

    await prisma.psiVote.upsert({
      where: {
        profile_id_user_id: {
          profile_id: profileId,
          user_id: userId,
        },
      },
      update: {
        weight,
        trust,
        performance,
        responsiveness,
        leadership,
        created_at: new Date(),
      },
      create: {
        profile_id: profileId,
        user_id: userId,
        weight,
        trust,
        performance,
        responsiveness,
        leadership,
      },
    } as any);

    return this.getProfilePsi(profileId.toString());
  }

  async getProfilePsi(profileIdRaw: string) {
    const profileId = parseBigIntId(profileIdRaw);

    const votes = await prisma.psiVote.findMany({
      where: { profile_id: profileId },
    } as any);

    if (votes.length === 0) {
      return {
        profileId: profileIdRaw,
        voteCount: 0,
        overallScore: 0,
        parameters: {
          trustIntegrity: 50,
          performanceDelivery: 50,
          responsiveness: 50,
          leadershipAbility: 50,
        },
      };
    }

    let totalWeight = 0;
    let trustWeighted = 0;
    let performanceWeighted = 0;
    let responsivenessWeighted = 0;
    let leadershipWeighted = 0;

    for (const v of votes as any[]) {
      const w = v.weight as number;
      totalWeight += w;
      trustWeighted += w * (v.trust as number);
      performanceWeighted += w * (v.performance as number);
      responsivenessWeighted += w * (v.responsiveness as number);
      leadershipWeighted += w * (v.leadership as number);
    }

    if (totalWeight === 0) {
      totalWeight = 1;
    }

    const trustAvg = trustWeighted / totalWeight;
    const performanceAvg = performanceWeighted / totalWeight;
    const responsivenessAvg = responsivenessWeighted / totalWeight;
    const leadershipAvg = leadershipWeighted / totalWeight;

    const overallPercent =
      (trustAvg + performanceAvg + responsivenessAvg + leadershipAvg) / 4;

    // Map 0-100 → -100..+100 around a neutral 50
    const overallScore = Math.round((overallPercent - 50) * 2);

    return {
      profileId: profileIdRaw,
      voteCount: votes.length,
      overallScore,
      parameters: {
        trustIntegrity: trustAvg,
        performanceDelivery: performanceAvg,
        responsiveness: responsivenessAvg,
        leadershipAbility: leadershipAvg,
      },
    };
  }

  async listTrending(limit = 10) {
    const votes = await prisma.psiVote.findMany();

    const byProfile = new Map<bigint, {
      totalWeight: number;
      trustWeighted: number;
      performanceWeighted: number;
      responsivenessWeighted: number;
      leadershipWeighted: number;
      count: number;
    }>();

    for (const vAny of votes as any[]) {
      const v = vAny as {
        profile_id: bigint;
        weight: number;
        trust: number;
        performance: number;
        responsiveness: number;
        leadership: number;
      };
      const key = v.profile_id;
      let agg = byProfile.get(key);
      if (!agg) {
        agg = {
          totalWeight: 0,
          trustWeighted: 0,
          performanceWeighted: 0,
          responsivenessWeighted: 0,
          leadershipWeighted: 0,
          count: 0,
        };
        byProfile.set(key, agg);
      }
      agg.totalWeight += v.weight;
      agg.trustWeighted += v.weight * v.trust;
      agg.performanceWeighted += v.weight * v.performance;
      agg.responsivenessWeighted += v.weight * v.responsiveness;
      agg.leadershipWeighted += v.weight * v.leadership;
      agg.count += 1;
    }

    if (byProfile.size === 0) {
      return [];
    }

    const profileIds = Array.from(byProfile.keys());
    const profiles = await prisma.profile.findMany({
      where: { id: { in: profileIds } },
      include: { category: true },
    } as any);

    const profileMap = new Map<bigint, any>();
    for (const p of profiles as any[]) {
      profileMap.set(p.id as bigint, p);
    }

    const results = Array.from(byProfile.entries()).map(([id, agg]) => {
      const w = agg.totalWeight || 1;
      const trustAvg = agg.trustWeighted / w;
      const performanceAvg = agg.performanceWeighted / w;
      const responsivenessAvg = agg.responsivenessWeighted / w;
      const leadershipAvg = agg.leadershipWeighted / w;
      const overallPercent =
        (trustAvg + performanceAvg + responsivenessAvg + leadershipAvg) / 4;
      const overallScore = Math.round((overallPercent - 50) * 2);

      const profile = profileMap.get(id);

      return {
        profileId: id.toString(),
        overallScore,
        voteCount: agg.count,
        parameters: {
          trustIntegrity: trustAvg,
          performanceDelivery: performanceAvg,
          responsiveness: responsivenessAvg,
          leadershipAbility: leadershipAvg,
        },
        profile: profile
          ? {
              id: profile.id.toString(),
              name: profile.name as string,
              categoryName: profile.category?.name_en ?? null,
              photoUrl: (profile as any).photo_url ?? null,
            }
          : null,
      };
    });

    results.sort((a, b) => b.overallScore - a.overallScore);

    return results.slice(0, limit);
  }
}

export const psiService = new PsiService();
