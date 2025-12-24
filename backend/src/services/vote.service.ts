import type { Poll } from "@prisma/client";

import { prisma } from "../utils/db";
import { voteRepository } from "../repositories/vote.repository";
import type { PollConfigId } from "../types/pollConfig.types";

export interface CastVoteParams {
  pollId: bigint;
  response: unknown;
  userId?: bigint | null;
  inviteToken?: string;
}

function ensureLive(poll: Poll): void {
  if (poll.status !== "PUBLISHED") {
    const err = new Error("POLL_NOT_PUBLISHED");
    (err as any).code = "POLL_NOT_PUBLISHED";
    throw err;
  }

  const now = new Date();

  if (poll.start_at && poll.start_at > now) {
    const err = new Error("POLL_NOT_STARTED");
    (err as any).code = "POLL_NOT_STARTED";
    throw err;
  }

  if (poll.end_at && poll.end_at <= now) {
    const err = new Error("POLL_ENDED");
    (err as any).code = "POLL_ENDED";
    throw err;
  }
}

function validateResponseShape(pollConfig: any, response: unknown): void {
  if (response === null || typeof response !== "object") {
    const err = new Error("INVALID_RESPONSE");
    (err as any).code = "INVALID_RESPONSE";
    throw err;
  }

  const rules = (pollConfig.rules || {}) as {
    contentRules?: { minOptions?: number; maxOptions?: number };
  };
  const template = pollConfig.ui_template as string;

  const content = rules.contentRules || {};
  const minOptions = content.minOptions;
  const maxOptions = content.maxOptions;

  const anyResponse = response as any;
  const selectedOptions = Array.isArray(anyResponse.selectedOptions)
    ? anyResponse.selectedOptions
    : null;

  // Enforce max selections only when selectedOptions is present.
  if (selectedOptions) {
    const count = selectedOptions.length;
    if (typeof minOptions === "number" && count < minOptions) {
      const err = new Error("INVALID_RESPONSE_MIN_OPTIONS");
      (err as any).code = "INVALID_RESPONSE";
      throw err;
    }
    if (typeof maxOptions === "number" && count > maxOptions) {
      const err = new Error("INVALID_RESPONSE_MAX_OPTIONS");
      (err as any).code = "INVALID_RESPONSE";
      throw err;
    }
  }

  // Very lightweight type-based checks by template, without over-constraining.
  if (template === "YES_NO") {
    const choice = (response as any).choice;
    if (choice !== undefined && choice !== "YES" && choice !== "NO") {
      const err = new Error("INVALID_RESPONSE_TYPE");
      (err as any).code = "INVALID_RESPONSE";
      throw err;
    }
  }

  if (template === "RATING") {
    const value = (response as any).value;
    if (value !== undefined && typeof value !== "number") {
      const err = new Error("INVALID_RESPONSE_TYPE");
      (err as any).code = "INVALID_RESPONSE";
      throw err;
    }
  }
}

export class VoteService {
  async castVote(params: CastVoteParams): Promise<void> {
    const { pollId, response, userId, inviteToken } = params;

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { pollConfig: true },
    });

    if (!poll) {
      const err = new Error("NOT_FOUND");
      (err as any).code = "NOT_FOUND";
      throw err;
    }

    ensureLive(poll);

    const pollConfig = poll.pollConfig;
    const permissions = (pollConfig.permissions || {}) as { inviteOnly?: boolean };
    const inviteOnly = permissions.inviteOnly === true;

    let resolvedUserId: bigint | null = userId ?? null;
    let inviteId: bigint | null = null;

    if (inviteToken) {
      const invite = await prisma.invite.findUnique({ where: { token: inviteToken } });
      if (!invite || invite.poll_id !== pollId) {
        const err = new Error("INVALID_INVITE");
        (err as any).code = "INVALID_INVITE";
        throw err;
      }
      inviteId = invite.id;
    }

    if (inviteOnly) {
      if (!inviteId) {
        const err = new Error("INVITE_REQUIRED");
        (err as any).code = "INVITE_REQUIRED";
        throw err;
      }
    } else {
      if (!resolvedUserId && !inviteId) {
        const err = new Error("AUTH_OR_INVITE_REQUIRED");
        (err as any).code = "AUTH_OR_INVITE_REQUIRED";
        throw err;
      }
    }

    if (resolvedUserId) {
      const existing = await voteRepository.findByUser(pollId, resolvedUserId);
      if (existing) {
        const err = new Error("ALREADY_VOTED");
        (err as any).code = "ALREADY_VOTED";
        throw err;
      }
    }

    if (inviteId) {
      const existing = await voteRepository.findByInvite(pollId, inviteId);
      if (existing) {
        const err = new Error("ALREADY_VOTED");
        (err as any).code = "ALREADY_VOTED";
        throw err;
      }
    }

    validateResponseShape(pollConfig, response);

    await voteRepository.create({
      poll_id: pollId,
      poll_config_id: poll.poll_config_id as PollConfigId,
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

export const voteService = new VoteService();
