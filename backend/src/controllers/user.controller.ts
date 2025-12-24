import type { Response } from "express";
import { z } from "zod";

import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { userService } from "../services/user.service";

const profileSchema = z.object({
  name: z.string().min(1),
  age: z.coerce.number().int().min(0).max(120),
  address: z.string().optional(),
  current_location: z.string().optional(),
  permanent_address: z.string().optional(),
});

export async function saveProfileHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = profileSchema.parse(req.body);

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = await userService.saveProfile(req.user.id, parsed);

    return res.status(200).json({ is_verified: result.isVerified });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid payload", issues: err.errors });
    }

    if ((err as any)?.code === "INVALID_PROFILE") {
      return res.status(400).json({ message: "Invalid profile" });
    }

    if ((err as any)?.code === "USER_NOT_FOUND") {
      return res.status(404).json({ message: "User not found" });
    }

    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
