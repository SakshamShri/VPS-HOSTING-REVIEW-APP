import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { userPollService } from "../services/userPoll.service";

const createPollSchema = z.object({
  category_id: z.string().min(1),
  type: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "RATING", "YES_NO"]),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  options: z.array(z.string().min(1)).min(2),
  start_mode: z.enum(["INSTANT", "SCHEDULED"]),
  start_at: z.string().datetime().optional().nullable(),
  end_at: z.string().datetime().optional().nullable(),
  source_info: z.string().optional().nullable(),
});

const createInvitesSchema = z.object({
  mobiles: z.array(z.string().min(1)).optional().default([]),
  existing_group_ids: z.array(z.string().min(1)).optional().default([]),
  new_group: z
    .object({
      name: z.string().min(1),
      mobiles: z.array(z.string().min(1)).min(1),
    })
    .optional()
    .nullable(),
});

const createGroupSchema = z.object({
  name: z.string().min(1),
  mobiles: z.array(z.string().min(1)).min(1),
});

const updateGroupSchema = z.object({
  name: z.string().min(1),
  mobiles: z.array(z.string().min(1)).min(1),
});

export async function createUserPollHandler(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const parsed = createPollSchema.parse(req.body);

    let categoryId: bigint;
    try {
      categoryId = BigInt(parsed.category_id);
    } catch {
      return res.status(400).json({ message: "Invalid category_id" });
    }

    const now = new Date();
    const startAt =
      parsed.start_mode === "SCHEDULED" && parsed.start_at ? new Date(parsed.start_at) : null;
    const endAt = parsed.end_at ? new Date(parsed.end_at) : null;

    if (parsed.start_mode === "SCHEDULED" && !startAt) {
      return res.status(400).json({ message: "start_at is required for scheduled polls" });
    }

    if (parsed.start_mode === "SCHEDULED" && startAt && startAt <= now) {
      return res.status(400).json({ message: "start_at must be in the future" });
    }

    if (endAt && startAt && endAt <= startAt) {
      return res.status(400).json({ message: "end_at must be after start_at" });
    }

    if (parsed.start_mode === "INSTANT" && endAt && endAt <= now) {
      return res.status(400).json({ message: "end_at must be after current time" });
    }

    const poll = await userPollService.createPollForUser(req.user.id, {
      categoryId,
      type: parsed.type,
      title: parsed.title,
      description: parsed.description ?? null,
      options: parsed.options,
      startMode: parsed.start_mode,
      startAt,
      endAt,
      sourceInfo: parsed.source_info ?? null,
    });

    return res.status(201).json({
      id: poll.id.toString(),
      status: poll.status,
      start_at: poll.start_at,
      end_at: poll.end_at,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid payload", issues: err.errors });
    }

    // Helpful dev-time error when Prisma client/db schema is out of sync.
    if (err instanceof Prisma.PrismaClientValidationError) {
      const msg = String((err as any)?.message ?? "");
      if (msg.includes("Unknown argument") || msg.includes("category_id")) {
        return res.status(500).json({
          message:
            "Server schema is out of sync. Run `npx prisma migrate dev` (or `npx prisma generate`) and restart the backend.",
        });
      }
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      const msg = String((err as any)?.message ?? "");
      // Common when DB table/column doesn't exist yet (e.g., after adding category_id)
      if (err.code === "P2021" || err.code === "P2022" || msg.toLowerCase().includes("category_id")) {
        return res.status(500).json({
          message:
            "Database is out of sync with Prisma schema. Run `npx prisma migrate dev` and restart the backend.",
        });
      }
    }

    const code = (err as any)?.code as string | undefined;
    if (
      code === "CATEGORY_NOT_FOUND" ||
      code === "CATEGORY_NOT_CHILD" ||
      code === "CATEGORY_NOT_ACTIVE" ||
      code === "CATEGORY_NOT_ALLOWED"
    ) {
      return res.status(403).json({ message: "Category is not allowed for user polls" });
    }

    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to create poll" });
  }
}

export async function createUserPollOwnerInviteHandler(req: AuthenticatedRequest, res: Response) {
	try {
		if (!req.user) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const pollIdParam = req.params.id;
		if (!pollIdParam) {
			return res.status(400).json({ message: "Poll id is required" });
		}

		const pollId = BigInt(pollIdParam);
		const result = await userPollService.createOwnerInviteForUser(req.user.id, pollId);
		return res.status(200).json(result);
	} catch (err) {
		if (err instanceof z.ZodError) {
			return res.status(400).json({ message: "Invalid payload", issues: err.errors });
		}

		const code = (err as any)?.code as string | undefined;
		if (code === "POLL_NOT_FOUND") {
			return res.status(404).json({ message: "Poll not found" });
		}
		if (code === "POLL_NOT_LIVE") {
			return res.status(400).json({ message: "Poll is not live" });
		}
		if (code === "POLL_NOT_INVITE_ONLY") {
			return res.status(400).json({ message: "Poll is not invite-only" });
		}

		// eslint-disable-next-line no-console
		console.error(err);
		return res.status(500).json({ message: "Failed to create owner invite" });
	}
}

export async function createUserPollInvitesHandler(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const pollIdParam = req.params.id;
    if (!pollIdParam) {
      return res.status(400).json({ message: "Poll id is required" });
    }

    const pollId = BigInt(pollIdParam);
    const parsed = createInvitesSchema.parse(req.body);

    const existingGroupIds = parsed.existing_group_ids.map((id) => BigInt(id));

    const invites = await userPollService.createInvitesForPoll(req.user.id, pollId, {
      mobiles: parsed.mobiles,
      existingGroupIds,
      newGroup: parsed.new_group ?? null,
    });

    return res.status(201).json({ invites });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid payload", issues: err.errors });
    }

    if ((err as any)?.code === "NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ message: "Poll not found" });
    }

    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to create invites" });
  }
}

export async function listUserGroupsHandler(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const groups = await userPollService.listGroupsForUser(req.user.id);
    return res.status(200).json({ groups });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch groups" });
  }
}

export async function createUserGroupHandler(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const parsed = createGroupSchema.parse(req.body);

    const group = await userPollService.createGroupForUser(req.user.id, parsed.name, parsed.mobiles);
    return res.status(201).json({ group });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid payload", issues: err.errors });
    }

    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to create group" });
  }
}

export async function updateUserGroupHandler(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const groupIdParam = req.params.id;
    if (!groupIdParam) {
      return res.status(400).json({ message: "Group id is required" });
    }

    const groupId = BigInt(groupIdParam);
    const parsed = updateGroupSchema.parse(req.body);

    const group = await userPollService.updateGroupForUser(
      req.user.id,
      groupId,
      parsed.name,
      parsed.mobiles
    );

    return res.status(200).json({ group });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid payload", issues: err.errors });
    }

    if ((err as any)?.code === "GROUP_NOT_FOUND") {
      return res.status(404).json({ message: "Group not found" });
    }

    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to update group" });
  }
}
