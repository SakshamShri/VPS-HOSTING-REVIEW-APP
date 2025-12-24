import { Router } from "express";

import { requireUser } from "../middleware/auth.middleware";
import { saveProfileHandler } from "../controllers/user.controller";
import { feedController } from "../controllers/feed.controller";
import { listUserClaimableCategoriesHandler } from "../controllers/userCategory.controller";
import {
  createUserGroupHandler,
  createUserPollHandler,
  createUserPollInvitesHandler,
  createUserPollOwnerInviteHandler,
  listUserGroupsHandler,
  updateUserGroupHandler,
} from "../controllers/userPoll.controller";

export const userRouter = Router();

userRouter.post("/user/profile", requireUser, saveProfileHandler);
userRouter.get("/user/feed", requireUser, (req, res) => feedController.listUserFeed(req, res));
userRouter.get("/user/categories/claimable", requireUser, (req, res) =>
  listUserClaimableCategoriesHandler(req, res)
);
userRouter.post("/user/polls", requireUser, createUserPollHandler);
userRouter.post("/user/polls/:id/invites", requireUser, createUserPollInvitesHandler);
userRouter.post("/user/polls/:id/owner-invite", requireUser, createUserPollOwnerInviteHandler);
userRouter.get("/user/groups", requireUser, listUserGroupsHandler);
userRouter.post("/user/groups", requireUser, createUserGroupHandler);
userRouter.patch("/user/groups/:id", requireUser, updateUserGroupHandler);
