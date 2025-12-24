import type { Request, Response } from "express";
import { z } from "zod";

import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { psiService } from "../services/psi.service";

const idParamSchema = z.object({ id: z.string().min(1) });

const psiVoteSchema = z.object({
  trustIntegrity: z.number().min(0).max(100),
  performanceDelivery: z.number().min(0).max(100),
  responsiveness: z.number().min(0).max(100),
  leadershipAbility: z.number().min(0).max(100),
});

function parseId(req: Request): string {
  return idParamSchema.parse(req.params).id;
}

export class PsiController {
  async userSubmitVote(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    try {
      const profileId = parseId(req);
      const body = psiVoteSchema.parse(req.body);

      const result = await psiService.submitVote({
        userId: req.user.id.toString(),
        profileId,
        ratings: body,
      });

      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid payload", issues: err.errors });
        return;
      }
      const code = (err as any)?.code as string | undefined;
      if (code === "PROFILE_NOT_FOUND") {
        res.status(404).json({ message: "Profile not found" });
        return;
      }
      if (code === "USER_NOT_FOUND" || code === "INVALID_ID") {
        res.status(400).json({ message: "Invalid user or profile" });
        return;
      }
      throw err;
    }
  }

  async userTrending(_req: AuthenticatedRequest, res: Response) {
    const items = await psiService.listTrending(20);
    res.json({ profiles: items });
  }
}

export const psiController = new PsiController();
