import type { Request, Response } from "express";
import { z } from "zod";

import { pollService } from "../services/poll.service";
import { pollCreateSchema, pollUpdateSchema, type PollCreateInput, type PollUpdateInput } from "../validators/poll.validator";
import type { PollId } from "../types/poll.types";
import { verifyToken } from "../utils/jwt";
import type { JwtPayload } from "../types/auth.types";
import { voteService } from "../services/vote.service";

const idParamSchema = z.object({ id: z.string() });

function parseId(req: Request): PollId {
  const { id } = idParamSchema.parse(req.params);
  return BigInt(id);
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error("INVALID_DATE");
  }
  return d;
}

export class PollController {
  async create(req: Request, res: Response) {
    const body: PollCreateInput = pollCreateSchema.parse(req.body);

    try {
      const created = await pollService.create({
        title: body.title,
        description: body.description ?? null,
        category_id: BigInt(body.categoryId),
        poll_config_id: BigInt(body.pollConfigId),
        status: "DRAFT",
        start_at: parseDate(body.startAt),
        end_at: parseDate(body.endAt),
      });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "CATEGORY_NOT_CHILD") {
          res.status(400).json({ message: "category_id must be a child category" });
          return;
        }
        if (err.message === "CATEGORY_NOT_ACTIVE") {
          res.status(400).json({ message: "Category must be ACTIVE to create or publish polls" });
          return;
        }
        if (err.message === "CATEGORY_NOT_FOUND") {
          res
            .status(400)
            .json({ message: "category_id does not reference a valid category" });
          return;
        }
        if (err.message === "CONFIG_NOT_FOUND") {
          res
            .status(400)
            .json({ message: "poll_config_id does not reference a valid poll config" });
          return;
        }
        if (err.message === "CONFIG_NOT_ACTIVE") {
          res
            .status(400)
            .json({ message: "Poll config must be ACTIVE to create or publish polls" });
          return;
        }
        if (err.message === "INVALID_DATE") {
          res.status(400).json({ message: "startAt/endAt must be valid dates" });
          return;
        }
      }
      throw err;
    }
  }

  async update(req: Request, res: Response) {
    const id = parseId(req);
    const body: PollUpdateInput = pollUpdateSchema.parse(req.body);

    try {
      const updated = await pollService.update(id, {
        title: body.title,
        description: body.description,
        category_id: body.categoryId ? BigInt(body.categoryId) : undefined,
        poll_config_id: body.pollConfigId ? BigInt(body.pollConfigId) : undefined,
        start_at: body.startAt ? parseDate(body.startAt) ?? undefined : undefined,
        end_at: body.endAt ? parseDate(body.endAt) ?? undefined : undefined,
      });
      res.json(updated);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "NOT_FOUND") {
          res.status(404).json({ message: "Poll not found" });
          return;
        }
        if (err.message === "NOT_EDITABLE") {
          res.status(400).json({ message: "Published or closed polls cannot be edited" });
          return;
        }
        if (err.message === "CATEGORY_NOT_CHILD") {
          res.status(400).json({ message: "category_id must be a child category" });
          return;
        }
        if (err.message === "CATEGORY_NOT_ACTIVE") {
          res.status(400).json({ message: "Category must be ACTIVE to create or publish polls" });
          return;
        }
        if (err.message === "CATEGORY_NOT_FOUND") {
          res
            .status(400)
            .json({ message: "category_id does not reference a valid category" });
          return;
        }
        if (err.message === "CONFIG_NOT_FOUND") {
          res
            .status(400)
            .json({ message: "poll_config_id does not reference a valid poll config" });
          return;
        }
        if (err.message === "CONFIG_NOT_ACTIVE") {
          res
            .status(400)
            .json({ message: "Poll config must be ACTIVE to create or publish polls" });
          return;
        }
        if (err.message === "INVALID_DATE") {
          res.status(400).json({ message: "startAt/endAt must be valid dates" });
          return;
        }
      }
      throw err;
    }
  }

  async list(_req: Request, res: Response) {
    const items = await pollService.list();
    res.json(items);
  }

  async getById(req: Request, res: Response) {
    const id = parseId(req);
    const poll = await pollService.getById(id);
    if (!poll) {
      res.status(404).json({ message: "Poll not found" });
      return;
    }
    res.json(poll);
  }

  async getForVote(req: Request, res: Response) {
    const id = parseId(req);
    const detail = await pollService.getForVote(id);
    if (!detail) {
      res.status(404).json({ message: "Poll not found" });
      return;
    }

    // Public-facing shape tailored for the voting page, exposing only
    // fields needed for rendering and theming.
    res.json({
      poll: {
        id: detail.id.toString(),
        title: detail.title,
        description: detail.description,
        status: detail.status,
        startAt: detail.start_at,
        endAt: detail.end_at,
      },
      pollConfig: detail.poll_config,
    });
  }

  async publish(req: Request, res: Response) {
    const id = parseId(req);
    try {
      const published = await pollService.publish(id);
      res.json(published);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "NOT_FOUND") {
          res.status(404).json({ message: "Poll not found" });
          return;
        }
        if (err.message === "INVALID_STATUS") {
          res.status(400).json({ message: "Only DRAFT polls can be published" });
          return;
        }
        if (err.message === "CATEGORY_NOT_ACTIVE") {
          res.status(400).json({ message: "Category must be ACTIVE to create or publish polls" });
          return;
        }
        if (err.message === "CONFIG_NOT_ACTIVE") {
          res
            .status(400)
            .json({ message: "Poll config must be ACTIVE to create or publish polls" });
          return;
        }
      }
      throw err;
    }
  }

  async close(req: Request, res: Response) {
    const id = parseId(req);
    try {
      const closed = await pollService.close(id);
      res.json(closed);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "NOT_FOUND") {
          res.status(404).json({ message: "Poll not found" });
          return;
        }
        if (err.message === "INVALID_STATUS") {
          res.status(400).json({ message: "Only PUBLISHED polls can be closed" });
          return;
        }
      }
      throw err;
    }
  }

  async vote(req: Request, res: Response) {
    const id = parseId(req);

    const bodySchema = z.object({
      response: z.unknown(),
      invite_token: z.string().optional(),
    });

    const { response: payload, invite_token } = bodySchema.parse(req.body);

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    let userId: bigint | null = null;
    const token = authHeader.slice("Bearer ".length);
    try {
      const decoded = verifyToken(token) as JwtPayload;
      userId = BigInt(decoded.userId);
    } catch (err) {
      res.status(401).json({ message: "Invalid token" });
      return;
    }

    try {
      await voteService.castVote({
        pollId: id,
        response: payload,
        userId,
        inviteToken: invite_token,
      });

      res.status(201).json({ message: "Vote recorded" });
    } catch (err) {
      const code = (err as any)?.code as string | undefined;
      if (code === "NOT_FOUND") {
        res.status(404).json({ message: "Poll not found" });
        return;
      }
      if (code === "POLL_NOT_PUBLISHED") {
        res.status(400).json({ message: "Poll is not open for voting" });
        return;
      }
      if (code === "POLL_NOT_STARTED") {
        res.status(400).json({ message: "Poll has not started yet" });
        return;
      }
      if (code === "POLL_ENDED") {
        res.status(400).json({ message: "Poll has already ended" });
        return;
      }
      if (code === "INVALID_INVITE") {
        res.status(400).json({ message: "Invalid invite token" });
        return;
      }
      if (code === "INVITE_REQUIRED") {
        res.status(401).json({ message: "Invite token required for this poll" });
        return;
      }
      if (code === "AUTH_OR_INVITE_REQUIRED") {
        res.status(401).json({ message: "Authentication or invite token required" });
        return;
      }
      if (code === "ALREADY_VOTED") {
        res.status(409).json({ message: "You have already voted in this poll" });
        return;
      }
      if (code === "INVALID_RESPONSE") {
        res.status(400).json({ message: "Response does not match poll configuration" });
        return;
      }

      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}

export const pollController = new PollController();
