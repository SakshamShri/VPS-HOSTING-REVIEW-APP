import { prisma } from "../utils/db";

export class InviteService {
  async validateUserPollInvite(token: string) {
    const invite = await prisma.userPollInvite.findUnique({
      where: { token },
      include: { poll: true },
    });

    if (!invite) {
      const err = new Error("INVITE_NOT_FOUND");
      (err as any).code = "INVITE_NOT_FOUND";
      throw err;
    }

    if (invite.status !== "PENDING") {
      const err = new Error("INVITE_ALREADY_USED");
      (err as any).code = "INVITE_ALREADY_USED";
      throw err;
    }

    if (!invite.poll || !["LIVE", "SCHEDULED"].includes(invite.poll.status)) {
      const err = new Error("POLL_NOT_ACTIVE");
      (err as any).code = "POLL_NOT_ACTIVE";
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

  async acceptUserPollInvite(token: string, userId: bigint) {
    return prisma.$transaction(async (tx) => {
      const invite = await tx.userPollInvite.findUnique({
        where: { token },
        include: { poll: true },
      });

      if (!invite) {
        const err = new Error("INVITE_NOT_FOUND");
        (err as any).code = "INVITE_NOT_FOUND";
        throw err;
      }
      if (invite.status !== "PENDING") {
        const err = new Error("INVITE_ALREADY_USED");
        (err as any).code = "INVITE_ALREADY_USED";
        throw err;
      }
      if (!invite.poll || !["LIVE", "SCHEDULED"].includes(invite.poll.status)) {
        const err = new Error("POLL_NOT_ACTIVE");
        (err as any).code = "POLL_NOT_ACTIVE";
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

  async rejectUserPollInvite(token: string) {
    return prisma.$transaction(async (tx) => {
      const invite = await tx.userPollInvite.findUnique({
        where: { token },
        include: { poll: true },
      });

      if (!invite) {
        const err = new Error("INVITE_NOT_FOUND");
        (err as any).code = "INVITE_NOT_FOUND";
        throw err;
      }
      if (invite.status !== "PENDING") {
        const err = new Error("INVITE_ALREADY_USED");
        (err as any).code = "INVITE_ALREADY_USED";
        throw err;
      }
      if (!invite.poll || !["LIVE", "SCHEDULED"].includes(invite.poll.status)) {
        const err = new Error("POLL_NOT_ACTIVE");
        (err as any).code = "POLL_NOT_ACTIVE";
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

export const inviteService = new InviteService();
