import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { userPollService } from "../services/userPoll.service";
import { prisma } from "../utils/db";

const createPollSchema = z.object({
  category_id: z.string().min(1),
  type: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "RATING", "YES_NO"]),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  options: z
    .array(
      z.object({
        label: z.string().min(1),
        image_url: z.string().url().optional().nullable(),
      })
    )
    .min(2),
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

const groupMemberSchema = z.object({
  mobile: z.string().min(1),
  name: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
});

const createGroupSchema = z.object({
  name: z.string().min(1),
  tags: z.array(z.string().min(1)).optional().default([]),
  members: z.array(groupMemberSchema).min(1),
});

const updateGroupSchema = z.object({
  name: z.string().min(1),
  tags: z.array(z.string().min(1)).optional().default([]),
  members: z.array(groupMemberSchema).min(1),
});

const extendPollSchema = z.object({
  end_at: z.string().datetime(),
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
      options: parsed.options.map((o) => ({ label: o.label, imageUrl: o.image_url ?? null })),
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

    const group = await userPollService.createGroupForUser(
      req.user.id,
      parsed.name,
      parsed.members,
      parsed.tags ?? [],
    );
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
      parsed.members,
      parsed.tags ?? [],
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

export async function listUserPollInvitationsHandler(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const invites = await userPollService.listInvitedPollsForUser(req.user.id);
    return res.status(200).json({ invites });
  } catch (err) {
    const code = (err as any)?.code as string | undefined;
    if (code === "USER_NOT_FOUND") {
      return res.status(404).json({ message: "User not found" });
    }

    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch poll invitations" });
  }
}

export async function listUserPollsHandler(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const polls = await userPollService.listPollsForUser(req.user.id);
    return res.status(200).json({ polls });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch polls" });
  }
}

export async function endUserPollHandler(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const pollIdParam = req.params.id;
    if (!pollIdParam) {
      return res.status(400).json({ message: "Poll id is required" });
    }

    const pollId = BigInt(pollIdParam);
    const result = await userPollService.endPollForUser(req.user.id, pollId);
    return res.status(200).json({ poll: result });
  } catch (err) {
    const code = (err as any)?.code as string | undefined;
    if (code === "NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ message: "Poll not found" });
    }
    if (code === "INVALID_STATUS") {
      return res.status(400).json({ message: "Poll status does not allow ending" });
    }

    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to end poll" });
  }
}

export async function extendUserPollHandler(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const pollIdParam = req.params.id;
    if (!pollIdParam) {
      return res.status(400).json({ message: "Poll id is required" });
    }

    const pollId = BigInt(pollIdParam);
    const parsed = extendPollSchema.parse(req.body);
    const newEndAt = new Date(parsed.end_at);

    const result = await userPollService.extendPollForUser(req.user.id, pollId, newEndAt);
    return res.status(200).json({ poll: result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid payload", issues: err.errors });
    }

    const code = (err as any)?.code as string | undefined;
    if (code === "NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ message: "Poll not found" });
    }
    if (code === "INVALID_END_AT" || code === "END_AT_IN_PAST" || code === "END_AT_BEFORE_START") {
      return res.status(400).json({ message: "Invalid end_at for poll" });
    }
    if (code === "POLL_ALREADY_CLOSED") {
      return res.status(400).json({ message: "Poll is already closed" });
    }

    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to extend poll" });
  }
}

export async function getUserPollDetailHandler(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const pollIdParam = req.params.id;
    if (!pollIdParam) {
      return res.status(400).json({ message: "Poll id is required" });
    }

    const pollId = BigInt(pollIdParam);
    const poll = await userPollService.getPollDetailForUser(req.user.id, pollId);
    return res.status(200).json({ poll });
  } catch (err) {
    const code = (err as any)?.code as string | undefined;
    if (code === "NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ message: "Poll not found" });
    }

    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch poll details" });
  }
}

export async function uploadUserPollOptionImageHandler(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const file = (req as any).file as { path: string } | undefined;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Store as a relative URL under /uploads so the frontend can render it directly
    const parts = file.path.split("user-poll-options");
    const suffix = parts.length > 1 ? parts[1] : "";
    const relativePath = `/uploads/user-poll-options${suffix}`;

    return res.status(200).json({ image_url: relativePath });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to upload option image" });
  }
}

export async function uploadUserGroupPhotoHandler(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const groupIdParam = req.params.id;
    if (!groupIdParam) {
      return res.status(400).json({ message: "Group id is required" });
    }

    const groupId = BigInt(groupIdParam);

    const file = (req as any).file as { path: string } | undefined;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const group = await prisma.userInviteGroup.findFirst({
      where: { id: groupId, owner_id: req.user.id },
    });

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const parts = file.path.split("user-group-photos");
    const suffix = parts.length > 1 ? parts[1] : "";
    const relativePath = `/uploads/user-group-photos${suffix}`;

    const updated = await prisma.userInviteGroup.update({
      where: { id: groupId },
      // Cast through any so additional fields don't break older Prisma client types
      data: { photo_url: relativePath } as any,
    });

    const updatedAny = updated as any;
    return res.status(200).json({ photo_url: updatedAny.photo_url ?? relativePath });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to upload group photo" });
  }
}
