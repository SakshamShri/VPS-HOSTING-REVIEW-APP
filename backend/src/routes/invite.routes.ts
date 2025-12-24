import { Router } from "express";

import { requireUser } from "../middleware/auth.middleware";
import {
  acceptInviteHandler,
  rejectInviteHandler,
  validateInviteHandler,
} from "../controllers/invite.controller";

export const inviteRouter = Router();

inviteRouter.get("/invites/validate", validateInviteHandler);
inviteRouter.post("/invites/accept", requireUser, acceptInviteHandler);
inviteRouter.post("/invites/reject", requireUser, rejectInviteHandler);
