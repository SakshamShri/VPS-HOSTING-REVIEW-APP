"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voteService = exports.VoteService = void 0;
const db_1 = require("../utils/db");
const vote_repository_1 = require("../repositories/vote.repository");
function ensureLive(poll) {
    if (poll.status !== "PUBLISHED") {
        const err = new Error("POLL_NOT_PUBLISHED");
        err.code = "POLL_NOT_PUBLISHED";
        throw err;
    }
    const now = new Date();
    if (poll.start_at && poll.start_at > now) {
        const err = new Error("POLL_NOT_STARTED");
        err.code = "POLL_NOT_STARTED";
        throw err;
    }
    if (poll.end_at && poll.end_at <= now) {
        const err = new Error("POLL_ENDED");
        err.code = "POLL_ENDED";
        throw err;
    }
}
function validateResponseShape(pollConfig, response) {
    if (response === null || typeof response !== "object") {
        const err = new Error("INVALID_RESPONSE");
        err.code = "INVALID_RESPONSE";
        throw err;
    }
    const rules = (pollConfig.rules || {});
    const template = pollConfig.ui_template;
    const content = rules.contentRules || {};
    const minOptions = content.minOptions;
    const maxOptions = content.maxOptions;
    const anyResponse = response;
    const selectedOptions = Array.isArray(anyResponse.selectedOptions)
        ? anyResponse.selectedOptions
        : null;
    // Enforce max selections only when selectedOptions is present.
    if (selectedOptions) {
        const count = selectedOptions.length;
        if (typeof minOptions === "number" && count < minOptions) {
            const err = new Error("INVALID_RESPONSE_MIN_OPTIONS");
            err.code = "INVALID_RESPONSE";
            throw err;
        }
        if (typeof maxOptions === "number" && count > maxOptions) {
            const err = new Error("INVALID_RESPONSE_MAX_OPTIONS");
            err.code = "INVALID_RESPONSE";
            throw err;
        }
    }
    // Very lightweight type-based checks by template, without over-constraining.
    if (template === "YES_NO") {
        const choice = response.choice;
        if (choice !== undefined && choice !== "YES" && choice !== "NO") {
            const err = new Error("INVALID_RESPONSE_TYPE");
            err.code = "INVALID_RESPONSE";
            throw err;
        }
    }
    if (template === "RATING") {
        const value = response.value;
        if (value !== undefined && typeof value !== "number") {
            const err = new Error("INVALID_RESPONSE_TYPE");
            err.code = "INVALID_RESPONSE";
            throw err;
        }
    }
}
class VoteService {
    async castVote(params) {
        const { pollId, response, userId, inviteToken } = params;
        const poll = await db_1.prisma.poll.findUnique({
            where: { id: pollId },
            include: { pollConfig: true },
        });
        if (!poll) {
            const err = new Error("NOT_FOUND");
            err.code = "NOT_FOUND";
            throw err;
        }
        ensureLive(poll);
        const pollConfig = poll.pollConfig;
        const permissions = (pollConfig.permissions || {});
        const inviteOnly = permissions.inviteOnly === true;
        let resolvedUserId = userId ?? null;
        let inviteId = null;
        if (inviteToken) {
            const invite = await db_1.prisma.invite.findUnique({ where: { token: inviteToken } });
            if (!invite || invite.poll_id !== pollId) {
                const err = new Error("INVALID_INVITE");
                err.code = "INVALID_INVITE";
                throw err;
            }
            inviteId = invite.id;
        }
        if (inviteOnly) {
            if (!inviteId) {
                const err = new Error("INVITE_REQUIRED");
                err.code = "INVITE_REQUIRED";
                throw err;
            }
        }
        else {
            if (!resolvedUserId && !inviteId) {
                const err = new Error("AUTH_OR_INVITE_REQUIRED");
                err.code = "AUTH_OR_INVITE_REQUIRED";
                throw err;
            }
        }
        if (resolvedUserId) {
            const existing = await vote_repository_1.voteRepository.findByUser(pollId, resolvedUserId);
            if (existing) {
                const err = new Error("ALREADY_VOTED");
                err.code = "ALREADY_VOTED";
                throw err;
            }
        }
        if (inviteId) {
            const existing = await vote_repository_1.voteRepository.findByInvite(pollId, inviteId);
            if (existing) {
                const err = new Error("ALREADY_VOTED");
                err.code = "ALREADY_VOTED";
                throw err;
            }
        }
        validateResponseShape(pollConfig, response);
        await vote_repository_1.voteRepository.create({
            poll_id: pollId,
            poll_config_id: poll.poll_config_id,
            user_id: resolvedUserId,
            invite_id: inviteId,
            response,
        });
        // Best-effort audit log; keeps individual vote content and identity internal.
        // eslint-disable-next-line no-console
        console.log("[vote] recorded", {
            pollId: String(pollId),
            userId: resolvedUserId ? String(resolvedUserId) : null,
            inviteId: inviteId ? String(inviteId) : null,
        });
    }
}
exports.VoteService = VoteService;
exports.voteService = new VoteService();
