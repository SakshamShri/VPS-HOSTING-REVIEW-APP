"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteService = exports.InviteService = void 0;
const db_1 = require("../utils/db");
class InviteService {
    async validateUserPollInvite(token) {
        const invite = await db_1.prisma.userPollInvite.findUnique({
            where: { token },
            include: { poll: true },
        });
        if (!invite) {
            const err = new Error("INVITE_NOT_FOUND");
            err.code = "INVITE_NOT_FOUND";
            throw err;
        }
        if (invite.status !== "PENDING") {
            const err = new Error("INVITE_ALREADY_USED");
            err.code = "INVITE_ALREADY_USED";
            throw err;
        }
        if (!invite.poll || !["LIVE", "SCHEDULED"].includes(invite.poll.status)) {
            const err = new Error("POLL_NOT_ACTIVE");
            err.code = "POLL_NOT_ACTIVE";
            throw err;
        }
        return {
            pollId: invite.poll.id.toString(),
            type: invite.poll.type,
            title: invite.poll.title,
            description: invite.poll.description ?? null,
            status: invite.poll.status,
            start_at: invite.poll.start_at,
            end_at: invite.poll.end_at,
        };
    }
    async acceptUserPollInvite(token, userId) {
        return db_1.prisma.$transaction(async (tx) => {
            const invite = await tx.userPollInvite.findUnique({
                where: { token },
                include: { poll: true },
            });
            if (!invite) {
                const err = new Error("INVITE_NOT_FOUND");
                err.code = "INVITE_NOT_FOUND";
                throw err;
            }
            if (invite.status !== "PENDING") {
                const err = new Error("INVITE_ALREADY_USED");
                err.code = "INVITE_ALREADY_USED";
                throw err;
            }
            if (!invite.poll || !["LIVE", "SCHEDULED"].includes(invite.poll.status)) {
                const err = new Error("POLL_NOT_ACTIVE");
                err.code = "POLL_NOT_ACTIVE";
                throw err;
            }
            const updated = await tx.userPollInvite.update({
                where: { id: invite.id },
                data: {
                    status: "ACCEPTED",
                    user_id: userId,
                },
            });
            return {
                pollId: invite.poll.id.toString(),
                status: updated.status,
            };
        });
    }
    async rejectUserPollInvite(token) {
        return db_1.prisma.$transaction(async (tx) => {
            const invite = await tx.userPollInvite.findUnique({
                where: { token },
                include: { poll: true },
            });
            if (!invite) {
                const err = new Error("INVITE_NOT_FOUND");
                err.code = "INVITE_NOT_FOUND";
                throw err;
            }
            if (invite.status !== "PENDING") {
                const err = new Error("INVITE_ALREADY_USED");
                err.code = "INVITE_ALREADY_USED";
                throw err;
            }
            if (!invite.poll || !["LIVE", "SCHEDULED"].includes(invite.poll.status)) {
                const err = new Error("POLL_NOT_ACTIVE");
                err.code = "POLL_NOT_ACTIVE";
                throw err;
            }
            const updated = await tx.userPollInvite.update({
                where: { id: invite.id },
                data: {
                    status: "REJECTED",
                },
            });
            return {
                pollId: invite.poll.id.toString(),
                status: updated.status,
            };
        });
    }
}
exports.InviteService = InviteService;
exports.inviteService = new InviteService();
