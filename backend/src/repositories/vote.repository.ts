import type { Vote } from "@prisma/client";

import { prisma } from "../utils/db";

export interface CreateVoteInput {
  poll_id: bigint;
  poll_config_id: bigint;
  user_id?: bigint | null;
  invite_id?: bigint | null;
  response: unknown;
}

export class VoteRepository {
  async create(input: CreateVoteInput): Promise<Vote> {
    return prisma.vote.create({
      data: {
        poll_id: input.poll_id,
        poll_config_id: input.poll_config_id,
        user_id: input.user_id ?? null,
        invite_id: input.invite_id ?? null,
        response: input.response as any,
      },
    });
  }

  async findByUser(pollId: bigint, userId: bigint): Promise<Vote | null> {
    return prisma.vote.findFirst({
      where: {
        poll_id: pollId,
        user_id: userId,
      },
    });
  }

  async findByInvite(pollId: bigint, inviteId: bigint): Promise<Vote | null> {
    return prisma.vote.findFirst({
      where: {
        poll_id: pollId,
        invite_id: inviteId,
      },
    });
  }
}

export const voteRepository = new VoteRepository();
