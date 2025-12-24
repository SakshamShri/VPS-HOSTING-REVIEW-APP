"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userPollService = exports.UserPollService = void 0;
const crypto_1 = require("crypto");
const db_1 = require("../utils/db");
const category_repository_1 = require("../repositories/category.repository");
const inheritance_service_1 = require("./inheritance.service");
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL ?? "http://localhost:5173";
function normalizeMobile(mobile) {
    return mobile.replace(/\s+/g, "");
}
function buildInviteMessage(title, description, inviteUrl) {
    const desc = description ? ` - ${description}` : "";
    return `You are invited to answer a poll: ${title}${desc}. Open poll: ${inviteUrl}`;
}
async function ensureAllowedUserCategory(categoryId) {
    const category = await category_repository_1.categoryRepository.findById(categoryId);
    if (!category) {
        const err = new Error("CATEGORY_NOT_FOUND");
        err.code = "CATEGORY_NOT_FOUND";
        throw err;
    }
    if (category.domain && category.domain !== "POLL") {
        const err = new Error("CATEGORY_NOT_FOUND");
        err.code = "CATEGORY_NOT_FOUND";
        throw err;
    }
    if (category.is_parent) {
        const err = new Error("CATEGORY_NOT_CHILD");
        err.code = "CATEGORY_NOT_CHILD";
        throw err;
    }
    if (category.status !== "ACTIVE") {
        const err = new Error("CATEGORY_NOT_ACTIVE");
        err.code = "CATEGORY_NOT_ACTIVE";
        throw err;
    }
    const effective = await inheritance_service_1.inheritanceService.resolveEffectiveCategory(categoryId);
    if (!effective) {
        const err = new Error("CATEGORY_NOT_FOUND");
        err.code = "CATEGORY_NOT_FOUND";
        throw err;
    }
    const { effectiveClaimable, effectiveRequestAllowed, effectiveStatus } = effective;
    if (effectiveStatus !== "ACTIVE") {
        const err = new Error("CATEGORY_NOT_ACTIVE");
        err.code = "CATEGORY_NOT_ACTIVE";
        throw err;
    }
    if (effectiveClaimable !== "YES" || effectiveRequestAllowed !== "YES") {
        const err = new Error("CATEGORY_NOT_ALLOWED");
        err.code = "CATEGORY_NOT_ALLOWED";
        throw err;
    }
}
class UserPollService {
    async createPollForUser(userId, input) {
        const now = new Date();
        let status;
        let startAt = null;
        let endAt = null;
        if (input.startMode === "INSTANT") {
            status = "LIVE";
            startAt = now;
            endAt = input.endAt ?? null;
        }
        else {
            status = "SCHEDULED";
            startAt = input.startAt ?? null;
            endAt = input.endAt ?? null;
        }
        await ensureAllowedUserCategory(input.categoryId);
        const poll = await db_1.prisma.userPoll.create({
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
    async createOwnerInviteForUser(userId, pollId) {
        const poll = await db_1.prisma.userPoll.findUnique({ where: { id: pollId } });
        if (!poll) {
            const err = new Error("POLL_NOT_FOUND");
            err.code = "POLL_NOT_FOUND";
            throw err;
        }
        // Only allow owner share-link invites for live, invite-only polls
        if (poll.status !== "LIVE") {
            const err = new Error("POLL_NOT_LIVE");
            err.code = "POLL_NOT_LIVE";
            throw err;
        }
        if (!poll.is_invite_only) {
            const err = new Error("POLL_NOT_INVITE_ONLY");
            err.code = "POLL_NOT_INVITE_ONLY";
            throw err;
        }
        // If this user already has an invite for this poll (and hasn't fully rejected it), reuse it
        const existing = await db_1.prisma.userPollInvite.findFirst({
            where: {
                poll_id: pollId,
                user_id: userId,
            },
        });
        if (existing && existing.status !== "REJECTED") {
            return { token: existing.token };
        }
        const token = (0, crypto_1.randomUUID)();
        const invite = await db_1.prisma.userPollInvite.create({
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
    async createInvitesForPoll(userId, pollId, input) {
        const poll = await db_1.prisma.userPoll.findUnique({
            where: { id: pollId },
        });
        if (!poll || poll.creator_id !== userId) {
            const err = new Error("NOT_FOUND_OR_FORBIDDEN");
            err.code = "NOT_FOUND_OR_FORBIDDEN";
            throw err;
        }
        const allMobiles = new Set();
        // Existing groups
        if (input.existingGroupIds && input.existingGroupIds.length > 0) {
            const groups = await db_1.prisma.userInviteGroup.findMany({
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
            const createdGroup = await db_1.prisma.userInviteGroup.create({
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
        const invitesData = [];
        for (const mobile of allMobiles) {
            const token = (0, crypto_1.randomUUID)();
            const inviteUrl = `${pollUrlBase}?invite=${encodeURIComponent(token)}`;
            const message = buildInviteMessage(poll.title, poll.description ?? null, inviteUrl);
            const whatsappLink = `https://wa.me/${encodeURIComponent(mobile)}?text=${encodeURIComponent(message)}`;
            invitesData.push({ mobile, token, whatsapp_link: whatsappLink });
        }
        await db_1.prisma.userPollInvite.createMany({
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
    async listGroupsForUser(userId) {
        const groups = await db_1.prisma.userInviteGroup.findMany({
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
    async createGroupForUser(userId, name, mobiles) {
        const group = await db_1.prisma.userInviteGroup.create({
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
    async updateGroupForUser(userId, groupId, name, mobiles) {
        const existing = await db_1.prisma.userInviteGroup.findFirst({
            where: { id: groupId, owner_id: userId },
        });
        if (!existing) {
            const err = new Error("GROUP_NOT_FOUND");
            err.code = "GROUP_NOT_FOUND";
            throw err;
        }
        await db_1.prisma.$transaction(async (tx) => {
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
        const updated = await db_1.prisma.userInviteGroup.findUnique({
            where: { id: groupId },
            include: { members: true },
        });
        if (!updated) {
            const err = new Error("GROUP_NOT_FOUND");
            err.code = "GROUP_NOT_FOUND";
            throw err;
        }
        return {
            id: updated.id.toString(),
            name: updated.name,
            members: updated.members.map((m) => m.mobile),
        };
    }
}
exports.UserPollService = UserPollService;
exports.userPollService = new UserPollService();
