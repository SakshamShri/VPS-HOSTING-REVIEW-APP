"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voteRepository = exports.VoteRepository = void 0;
const db_1 = require("../utils/db");
class VoteRepository {
    async create(input) {
        return db_1.prisma.vote.create({
            data: {
                poll_id: input.poll_id,
                poll_config_id: input.poll_config_id,
                user_id: input.user_id ?? null,
                invite_id: input.invite_id ?? null,
                response: input.response,
            },
        });
    }
    async findByUser(pollId, userId) {
        return db_1.prisma.vote.findFirst({
            where: {
                poll_id: pollId,
                user_id: userId,
            },
        });
    }
    async findByInvite(pollId, inviteId) {
        return db_1.prisma.vote.findFirst({
            where: {
                poll_id: pollId,
                invite_id: inviteId,
            },
        });
    }
}
exports.VoteRepository = VoteRepository;
exports.voteRepository = new VoteRepository();
