import type { Request, Response } from "express";
import { z } from "zod";

import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { inviteService } from "../services/invite.service";

const tokenBodySchema = z.object({
  token: z.string().min(1),
});

export async function validateInviteHandler(req: Request, res: Response) {
  try {
    const token = (req.query.token as string | undefined) ?? "";
    if (!token) {
      return res.status(400).json({ message: "token is required" });
    }

    const summary = await inviteService.validateUserPollInvite(token);
    return res.status(200).json({ poll: summary });
  } catch (err) {
    const code = (err as any)?.code as string | undefined;
    if (code === "INVITE_NOT_FOUND") {
      return res.status(404).json({ message: "Invite not found" });
    }
    if (code === "INVITE_ALREADY_USED") {
      return res.status(400).json({ message: "Invite has already been used" });
    }
    if (code === "POLL_NOT_ACTIVE") {
      return res.status(400).json({ message: "Poll is not active" });
    }

    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to validate invite" });
  }
}

export async function acceptInviteHandler(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const parsed = tokenBodySchema.parse(req.body);
    const result = await inviteService.acceptUserPollInvite(parsed.token, req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid payload", issues: err.errors });
    }
    const code = (err as any)?.code as string | undefined;
    if (code === "INVITE_NOT_FOUND") {
      return res.status(404).json({ message: "Invite not found" });
    }
    if (code === "INVITE_ALREADY_USED") {
      return res.status(400).json({ message: "Invite has already been used" });
    }
    if (code === "POLL_NOT_ACTIVE") {
      return res.status(400).json({ message: "Poll is not active" });
    }

    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to accept invite" });
  }
}

export async function rejectInviteHandler(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const parsed = tokenBodySchema.parse(req.body);
    const result = await inviteService.rejectUserPollInvite(parsed.token);
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid payload", issues: err.errors });
    }
    const code = (err as any)?.code as string | undefined;
    if (code === "INVITE_NOT_FOUND") {
      return res.status(404).json({ message: "Invite not found" });
    }
    if (code === "INVITE_ALREADY_USED") {
      return res.status(400).json({ message: "Invite has already been used" });
    }
    if (code === "POLL_NOT_ACTIVE") {
      return res.status(400).json({ message: "Poll is not active" });
    }

    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to reject invite" });
  }
}
