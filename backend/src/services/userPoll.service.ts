import { randomUUID } from "crypto";

import { prisma } from "../utils/db";
import { categoryRepository } from "../repositories/category.repository";
import { inheritanceService } from "./inheritance.service";
import type { AuthRole } from "../types/auth.types";
import type { CategoryId } from "../types/category.types";

export type UserPollType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "RATING" | "YES_NO";
export type UserPollStatus = "DRAFT" | "LIVE" | "SCHEDULED" | "CLOSED";

export interface CreateUserPollInput {
  categoryId: CategoryId;
  type: UserPollType;
  title: string;
  description?: string | null;
  options: string[];
  startMode: "INSTANT" | "SCHEDULED";
  startAt?: Date | null;
  endAt?: Date | null;
  sourceInfo?: string | null;
}

export interface CreateUserPollInvitesInput {
  mobiles?: string[];
  existingGroupIds?: bigint[];
  newGroup?: {
    name: string;
    mobiles: string[];
  } | null;
}

const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL ?? "http://localhost:5173";

function normalizeMobile(mobile: string): string {
  return mobile.replace(/\s+/g, "");
}

function buildInviteMessage(title: string, description: string | null, inviteUrl: string): string {
  const desc = description ? ` - ${description}` : "";
  return `You are invited to answer a poll: ${title}${desc}. Open poll: ${inviteUrl}`;
}

async function ensureAllowedUserCategory(categoryId: CategoryId): Promise<void> {
  const category = await categoryRepository.findById(categoryId);
  if (!category) {
    const err = new Error("CATEGORY_NOT_FOUND");
    (err as any).code = "CATEGORY_NOT_FOUND";
    throw err;
  }
  if ((category as any).domain && (category as any).domain !== "POLL") {
    const err = new Error("CATEGORY_NOT_FOUND");
    (err as any).code = "CATEGORY_NOT_FOUND";
    throw err;
  }
  if (category.is_parent) {
    const err = new Error("CATEGORY_NOT_CHILD");
    (err as any).code = "CATEGORY_NOT_CHILD";
    throw err;
  }
  if (category.status !== "ACTIVE") {
    const err = new Error("CATEGORY_NOT_ACTIVE");
    (err as any).code = "CATEGORY_NOT_ACTIVE";
    throw err;
  }

  const effective = await inheritanceService.resolveEffectiveCategory(categoryId);
  if (!effective) {
    const err = new Error("CATEGORY_NOT_FOUND");
    (err as any).code = "CATEGORY_NOT_FOUND";
    throw err;
  }

  const { effectiveClaimable, effectiveRequestAllowed, effectiveStatus } = effective;
  if (effectiveStatus !== "ACTIVE") {
    const err = new Error("CATEGORY_NOT_ACTIVE");
    (err as any).code = "CATEGORY_NOT_ACTIVE";
    throw err;
  }
  if (effectiveClaimable !== "YES" || effectiveRequestAllowed !== "YES") {
    const err = new Error("CATEGORY_NOT_ALLOWED");
    (err as any).code = "CATEGORY_NOT_ALLOWED";
    throw err;
  }
}

export class UserPollService {
  async createPollForUser(userId: bigint, input: CreateUserPollInput) {
    const now = new Date();

    let status: UserPollStatus;
    let startAt: Date | null = null;
    let endAt: Date | null = null;

    if (input.startMode === "INSTANT") {
      status = "LIVE";
      startAt = now;
      endAt = input.endAt ?? null;
    } else {
      status = "SCHEDULED";
      startAt = input.startAt ?? null;
      endAt = input.endAt ?? null;
    }

    await ensureAllowedUserCategory(input.categoryId);

    const poll = await prisma.userPoll.create({
      data: {
        creator_id: userId,
        category_id: input.categoryId,
        title: input.title,
        description: input.description ?? null,
        source_info: input.sourceInfo ?? null,
        type: input.type,
        status,
        is_invite_only: true,
        start_at: startAt,
        end_at: endAt,
        options: {
          create: input.options.map((label, index) => ({
            label,
            display_order: index,
          })),
        },
      },
    });

    return poll;
  }

	async createOwnerInviteForUser(userId: bigint, pollId: bigint): Promise<{ token: string }> {
		const poll = await prisma.userPoll.findUnique({ where: { id: pollId } });
		if (!poll) {
			const err = new Error("POLL_NOT_FOUND");
			(err as any).code = "POLL_NOT_FOUND";
			throw err;
		}

		// Only allow owner share-link invites for live, invite-only polls
		if (poll.status !== "LIVE") {
			const err = new Error("POLL_NOT_LIVE");
			(err as any).code = "POLL_NOT_LIVE";
			throw err;
		}
		if (!poll.is_invite_only) {
			const err = new Error("POLL_NOT_INVITE_ONLY");
			(err as any).code = "POLL_NOT_INVITE_ONLY";
			throw err;
		}

		// If this user already has an invite for this poll (and hasn't fully rejected it), reuse it
		const existing = await prisma.userPollInvite.findFirst({
			where: {
				poll_id: pollId,
				user_id: userId,
			},
		});

		if (existing && existing.status !== "REJECTED") {
			return { token: existing.token };
		}

		const token = randomUUID();
		const invite = await prisma.userPollInvite.create({
			data: {
				poll_id: pollId,
				user_id: userId,
				mobile: `user:${userId.toString()}`,
				token,
				status: "PENDING",
			},
		});

		return { token: invite.token };
	}

  async createInvitesForPoll(
    userId: bigint,
    pollId: bigint,
    input: CreateUserPollInvitesInput
  ): Promise<
    {
      mobile: string;
      token: string;
      whatsapp_link: string;
    }[]
  > {
    const poll = await prisma.userPoll.findUnique({
      where: { id: pollId },
    });

    if (!poll || poll.creator_id !== userId) {
      const err = new Error("NOT_FOUND_OR_FORBIDDEN");
      (err as any).code = "NOT_FOUND_OR_FORBIDDEN";
      throw err;
    }

    const allMobiles = new Set<string>();

    // Existing groups
    if (input.existingGroupIds && input.existingGroupIds.length > 0) {
      const groups = await prisma.userInviteGroup.findMany({
        where: {
          id: { in: input.existingGroupIds },
          owner_id: userId,
        },
        include: { members: true },
      });

      for (const group of groups) {
        for (const member of group.members) {
          allMobiles.add(normalizeMobile(member.mobile));
        }
      }
    }

    // New group
    if (input.newGroup && input.newGroup.mobiles.length > 0) {
      const createdGroup = await prisma.userInviteGroup.create({
        data: {
          owner_id: userId,
          name: input.newGroup.name,
          members: {
            create: input.newGroup.mobiles.map((m) => ({ mobile: normalizeMobile(m) })),
          },
        },
        include: { members: true },
      });

      for (const member of createdGroup.members) {
        allMobiles.add(normalizeMobile(member.mobile));
      }
    }

    // Individual mobiles
    if (input.mobiles && input.mobiles.length > 0) {
      for (const m of input.mobiles) {
        allMobiles.add(normalizeMobile(m));
      }
    }

    if (allMobiles.size === 0) {
      return [];
    }

    const pollUrlBase = `${FRONTEND_BASE_URL}/polls/${poll.id}`;

    const invitesData: { mobile: string; token: string; whatsapp_link: string }[] = [];

    for (const mobile of allMobiles) {
      const token = randomUUID();
      const inviteUrl = `${pollUrlBase}?invite=${encodeURIComponent(token)}`;
      const message = buildInviteMessage(poll.title, poll.description ?? null, inviteUrl);
      const whatsappLink = `https://wa.me/${encodeURIComponent(mobile)}?text=${encodeURIComponent(
        message
      )}`;

      invitesData.push({ mobile, token, whatsapp_link: whatsappLink });
    }

    await prisma.userPollInvite.createMany({
      data: invitesData.map((i) => ({
        poll_id: pollId,
        mobile: i.mobile,
        token: i.token,
        status: "PENDING",
      })),
      skipDuplicates: true,
    });

    return invitesData;
  }

  async listGroupsForUser(userId: bigint) {
    const groups = await prisma.userInviteGroup.findMany({
      where: { owner_id: userId },
      include: { members: true },
      orderBy: { created_at: "desc" },
    });

    return groups.map((g) => ({
      id: g.id.toString(),
      name: g.name,
      members: g.members.map((m) => m.mobile),
    }));
  }

  async createGroupForUser(userId: bigint, name: string, mobiles: string[]) {
    const group = await prisma.userInviteGroup.create({
      data: {
        owner_id: userId,
        name,
        members: {
          create: mobiles.map((m) => ({ mobile: normalizeMobile(m) })),
        },
      },
      include: { members: true },
    });

    return {
      id: group.id.toString(),
      name: group.name,
      members: group.members.map((m) => m.mobile),
    };
  }

  async updateGroupForUser(userId: bigint, groupId: bigint, name: string, mobiles: string[]) {
    const existing = await prisma.userInviteGroup.findFirst({
      where: { id: groupId, owner_id: userId },
    });

    if (!existing) {
      const err = new Error("GROUP_NOT_FOUND");
      (err as any).code = "GROUP_NOT_FOUND";
      throw err;
    }

    await prisma.$transaction(async (tx) => {
      await tx.userInviteGroup.update({
        where: { id: groupId },
        data: { name },
      });

      await tx.userInviteGroupMember.deleteMany({ where: { group_id: groupId } });

      if (mobiles.length > 0) {
        await tx.userInviteGroupMember.createMany({
          data: mobiles.map((m) => ({
            group_id: groupId,
            mobile: normalizeMobile(m),
          })),
        });
      }
    });

    const updated = await prisma.userInviteGroup.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!updated) {
      const err = new Error("GROUP_NOT_FOUND");
      (err as any).code = "GROUP_NOT_FOUND";
      throw err;
    }

    return {
      id: updated.id.toString(),
      name: updated.name,
      members: updated.members.map((m) => m.mobile),
    };
  }
}

export const userPollService = new UserPollService();
