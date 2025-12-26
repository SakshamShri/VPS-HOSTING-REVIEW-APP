import { randomUUID } from "crypto";

import { prisma } from "../utils/db";
import { categoryRepository } from "../repositories/category.repository";
import { inheritanceService } from "./inheritance.service";
import type { AuthRole } from "../types/auth.types";
import type { CategoryId } from "../types/category.types";

export type UserPollType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "RATING" | "YES_NO";
export type UserPollStatus = "DRAFT" | "LIVE" | "SCHEDULED" | "CLOSED";
export type UserPollInviteStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface UserPollOptionInput {
  label: string;
  imageUrl?: string | null;
}

export interface CreateUserPollInput {
  categoryId: CategoryId;
  type: UserPollType;
  title: string;
  description?: string | null;
  options: UserPollOptionInput[];
  startMode: "INSTANT" | "SCHEDULED";
  startAt?: Date | null;
  endAt?: Date | null;
  sourceInfo?: string | null;
  mode?: "INVITE_ONLY" | "OPEN";
}

export interface GroupMemberInput {
  mobile: string;
  name?: string | null;
  bio?: string | null;
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

    // Default to invite-only if mode is not specified for backward compatibility
    const isInviteOnly = (input.mode ?? "INVITE_ONLY") !== "OPEN";

    const poll = await prisma.userPoll.create({
      data: {
        creator_id: userId,
        category_id: input.categoryId,
        title: input.title,
        description: input.description ?? null,
        source_info: input.sourceInfo ?? null,
        type: input.type,
        status,
        is_invite_only: isInviteOnly,
        start_at: startAt,
        end_at: endAt,
        options: {
          create: input.options.map((opt, index) => ({
            label: opt.label,
            image_url: opt.imageUrl ?? null,
            display_order: index,
          })),
        },
      },
    });

    return poll;
  }

  async listPollsForUser(userId: bigint) {
    const polls = await prisma.userPoll.findMany({
      where: { creator_id: userId },
      include: { invites: true },
      orderBy: { created_at: "desc" },
    });

    return polls.map((p: any) => {
      const invites = (p.invites ?? []) as Array<{ status: string }>;
      let accepted = 0;
      let pending = 0;
      let rejected = 0;
      for (const inv of invites) {
        if (inv.status === "ACCEPTED") accepted += 1;
        else if (inv.status === "PENDING") pending += 1;
        else if (inv.status === "REJECTED") rejected += 1;
      }

      return {
        id: p.id.toString(),
        title: p.title as string,
        description: (p.description as string | null) ?? null,
        type: p.type as UserPollType,
        status: p.status as UserPollStatus,
        start_at: p.start_at as Date | null,
        end_at: p.end_at as Date | null,
        total_invites: invites.length,
        accepted_count: accepted,
        pending_count: pending,
        rejected_count: rejected,
      };
    });
  }

  async getPollDetailForUser(userId: bigint, pollId: bigint) {
    const poll = await prisma.userPoll.findUnique({
      where: { id: pollId },
      include: { invites: true },
    });

    if (!poll || poll.creator_id !== userId) {
      const err = new Error("NOT_FOUND_OR_FORBIDDEN");
      (err as any).code = "NOT_FOUND_OR_FORBIDDEN";
      throw err;
    }

    const invites = (poll.invites ?? []) as Array<{
      mobile: string;
      status: UserPollInviteStatus;
    }>;

    // Preload all group members for this user so we can attach names/bios by mobile
    const groups = await prisma.userInviteGroup.findMany({
      where: { owner_id: userId },
      include: { members: true },
    });

    const metaByMobile = new Map<
      string,
      {
        name: string | null;
        bio: string | null;
      }
    >();

    for (const g of groups) {
      for (const m of g.members) {
        const key = m.mobile;
        if (!metaByMobile.has(key)) {
          metaByMobile.set(key, {
            name: (m as any).name ?? null,
            bio: (m as any).bio ?? null,
          });
        }
      }
    }

    let accepted = 0;
    let pending = 0;
    let rejected = 0;

    const inviteSummaries = invites.map((inv) => {
      if (inv.status === "ACCEPTED") accepted += 1;
      else if (inv.status === "PENDING") pending += 1;
      else if (inv.status === "REJECTED") rejected += 1;

      const meta = metaByMobile.get(inv.mobile) ?? { name: null, bio: null };

      return {
        mobile: inv.mobile,
        name: meta.name,
        bio: meta.bio,
        status: inv.status,
      };
    });

    return {
      id: poll.id.toString(),
      title: poll.title as string,
      description: (poll.description as string | null) ?? null,
      type: poll.type as UserPollType,
      status: poll.status as UserPollStatus,
      start_at: poll.start_at as Date | null,
      end_at: poll.end_at as Date | null,
      total_invites: invites.length,
      accepted_count: accepted,
      pending_count: pending,
      rejected_count: rejected,
      invites: inviteSummaries,
    };
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

  async joinOpenPollForUser(
    userId: bigint,
    pollId: bigint,
  ): Promise<{ token: string; status: UserPollInviteStatus }> {
    const poll = await prisma.userPoll.findUnique({ where: { id: pollId } });

    if (!poll) {
      const err = new Error("POLL_NOT_FOUND");
      (err as any).code = "POLL_NOT_FOUND";
      throw err;
    }

    // Only allow join for non invite-only (open) polls
    if (poll.is_invite_only) {
      const err = new Error("POLL_NOT_OPEN");
      (err as any).code = "POLL_NOT_OPEN";
      throw err;
    }

    if (!["LIVE", "SCHEDULED"].includes(poll.status as UserPollStatus)) {
      const err = new Error("POLL_NOT_ACTIVE");
      (err as any).code = "POLL_NOT_ACTIVE";
      throw err;
    }

    // If user already has an invite for this poll, reuse it
    const existing = await prisma.userPollInvite.findFirst({
      where: {
        poll_id: pollId,
        user_id: userId,
      },
    });

    if (existing) {
      return { token: existing.token, status: existing.status as UserPollInviteStatus };
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

    return { token: invite.token, status: invite.status as UserPollInviteStatus };
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
      tags: (g as any).tags ?? [],
      photo_url: (g as any).photo_url ?? null,
      members: g.members.map((m) => ({
        mobile: m.mobile,
        name: (m as any).name ?? null,
        bio: (m as any).bio ?? null,
      })),
    }));
  }

  async createGroupForUser(
    userId: bigint,
    name: string,
    members: GroupMemberInput[],
    tags: string[]
  ) {
    const group = await prisma.userInviteGroup.create({
      data: {
        owner_id: userId,
        name,
        // Cast through any so this compiles even if Prisma client types haven't picked up tags yet
        tags: tags as any,
        members: {
          create: members.map((m) => ({
            mobile: normalizeMobile(m.mobile),
            name: m.name ?? null,
            bio: m.bio ?? null,
          })),
        },
      } as any,
      include: { members: true },
    });

    const groupAny = group as any;

    return {
      id: groupAny.id.toString(),
      name: groupAny.name,
      tags: groupAny.tags ?? [],
      photo_url: groupAny.photo_url ?? null,
      members: (groupAny.members ?? []).map((m: any) => ({
        mobile: m.mobile,
        name: m.name ?? null,
        bio: m.bio ?? null,
      })),
    };
  }

  async updateGroupForUser(
    userId: bigint,
    groupId: bigint,
    name: string,
    members: GroupMemberInput[],
    tags: string[],
  ) {
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
        // Cast through any so additional fields don't break older Prisma client types
        data: { name, tags } as any,
      });

      await tx.userInviteGroupMember.deleteMany({ where: { group_id: groupId } });

      if (members.length > 0) {
        await tx.userInviteGroupMember.createMany({
          data: members.map((m) => ({
            group_id: groupId,
            mobile: normalizeMobile(m.mobile),
            name: m.name ?? null,
            bio: m.bio ?? null,
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
      tags: (updated as any).tags ?? [],
      photo_url: (updated as any).photo_url ?? null,
      members: updated.members.map((m) => ({
        mobile: m.mobile,
        name: (m as any).name ?? null,
        bio: (m as any).bio ?? null,
      })),
    };
  }

  async listInvitedPollsForUser(userId: bigint) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      const err = new Error("USER_NOT_FOUND");
      (err as any).code = "USER_NOT_FOUND";
      throw err;
    }

    const orConditions: any[] = [{ user_id: userId }];
    if (user.mobile) {
      orConditions.push({ mobile: user.mobile });
    }

    const invites = await prisma.userPollInvite.findMany({
      where: {
        OR: orConditions,
      },
      include: {
        poll: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const now = new Date();

    return invites
      .filter((inv) => !!inv.poll)
      .map((inv) => {
        const poll = inv.poll as any;
        const startAt: Date | null = poll.start_at ?? null;
        const endAt: Date | null = poll.end_at ?? null;

        let state: "ONGOING" | "FUTURE" | "EXPIRED" = "ONGOING";

        if (poll.status === "CLOSED") {
          state = "EXPIRED";
        } else if (startAt && startAt > now) {
          state = "FUTURE";
        } else if (endAt && endAt <= now) {
          state = "EXPIRED";
        } else if (poll.status === "SCHEDULED") {
          state = "FUTURE";
        } else {
          state = "ONGOING";
        }

        return {
          pollId: poll.id.toString(),
          title: poll.title as string,
          description: (poll.description as string | null) ?? null,
          pollStatus: poll.status as UserPollStatus,
          start_at: startAt,
          end_at: endAt,
          inviteStatus: inv.status as any,
          state,
          token: inv.token,
        };
      });
  }

  async endPollForUser(userId: bigint, pollId: bigint) {
    const poll = await prisma.userPoll.findUnique({
      where: { id: pollId },
      include: { invites: true },
    });

    if (!poll || poll.creator_id !== userId) {
      const err = new Error("NOT_FOUND_OR_FORBIDDEN");
      (err as any).code = "NOT_FOUND_OR_FORBIDDEN";
      throw err;
    }

    if (poll.status !== "LIVE" && poll.status !== "SCHEDULED" && poll.status !== "CLOSED") {
      const err = new Error("INVALID_STATUS");
      (err as any).code = "INVALID_STATUS";
      throw err;
    }

    const nextEndAt = poll.end_at ?? new Date();

    const updated = poll.status === "CLOSED"
      ? poll
      : await prisma.userPoll.update({
          where: { id: pollId },
          data: {
            status: "CLOSED",
            end_at: nextEndAt,
          },
          include: { invites: true },
        });

    const invites = (updated.invites ?? []) as Array<{ status: string }>;
    let accepted = 0;
    let pending = 0;
    let rejected = 0;
    for (const inv of invites) {
      if (inv.status === "ACCEPTED") accepted += 1;
      else if (inv.status === "PENDING") pending += 1;
      else if (inv.status === "REJECTED") rejected += 1;
    }

    return {
      id: updated.id.toString(),
      title: updated.title as string,
      description: (updated.description as string | null) ?? null,
      type: updated.type as UserPollType,
      status: updated.status as UserPollStatus,
      start_at: updated.start_at as Date | null,
      end_at: updated.end_at as Date | null,
      total_invites: invites.length,
      accepted_count: accepted,
      pending_count: pending,
      rejected_count: rejected,
    };
  }

  async extendPollForUser(userId: bigint, pollId: bigint, newEndAt: Date) {
    const now = new Date();
    if (!(newEndAt instanceof Date) || Number.isNaN(newEndAt.getTime())) {
      const err = new Error("INVALID_END_AT");
      (err as any).code = "INVALID_END_AT";
      throw err;
    }
    if (newEndAt <= now) {
      const err = new Error("END_AT_IN_PAST");
      (err as any).code = "END_AT_IN_PAST";
      throw err;
    }

    const poll = await prisma.userPoll.findUnique({
      where: { id: pollId },
      include: { invites: true },
    });

    if (!poll || poll.creator_id !== userId) {
      const err = new Error("NOT_FOUND_OR_FORBIDDEN");
      (err as any).code = "NOT_FOUND_OR_FORBIDDEN";
      throw err;
    }

    if (poll.start_at && newEndAt <= poll.start_at) {
      const err = new Error("END_AT_BEFORE_START");
      (err as any).code = "END_AT_BEFORE_START";
      throw err;
    }

    if (poll.status === "CLOSED") {
      const err = new Error("POLL_ALREADY_CLOSED");
      (err as any).code = "POLL_ALREADY_CLOSED";
      throw err;
    }

    const updated = await prisma.userPoll.update({
      where: { id: pollId },
      data: {
        end_at: newEndAt,
      },
      include: { invites: true },
    });

    const invites = (updated.invites ?? []) as Array<{ status: string }>;
    let accepted = 0;
    let pending = 0;
    let rejected = 0;
    for (const inv of invites) {
      if (inv.status === "ACCEPTED") accepted += 1;
      else if (inv.status === "PENDING") pending += 1;
      else if (inv.status === "REJECTED") rejected += 1;
    }

    return {
      id: updated.id.toString(),
      title: updated.title as string,
      description: (updated.description as string | null) ?? null,
      type: updated.type as UserPollType,
      status: updated.status as UserPollStatus,
      start_at: updated.start_at as Date | null,
      end_at: updated.end_at as Date | null,
      total_invites: invites.length,
      accepted_count: accepted,
      pending_count: pending,
      rejected_count: rejected,
    };
  }
}

export const userPollService = new UserPollService();
