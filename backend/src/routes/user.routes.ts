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
  endUserPollHandler,
  extendUserPollHandler,
  listUserPollInvitationsHandler,
  listUserPollsHandler,
  listUserGroupsHandler,
  updateUserGroupHandler,
  getUserPollDetailHandler,
  uploadUserPollOptionImageHandler,
  uploadUserGroupPhotoHandler,
  joinOpenUserPollHandler,
} from "../controllers/userPoll.controller";
import { userPollOptionUpload } from "../utils/userPollOptionUpload";
import { userGroupPhotoUpload } from "../utils/userGroupPhotoUpload";

export const userRouter = Router();

userRouter.post("/user/profile", requireUser, saveProfileHandler);
userRouter.get("/user/feed", requireUser, (req, res) => feedController.listUserFeed(req, res));
userRouter.get("/user/categories/claimable", requireUser, (req, res) =>
  listUserClaimableCategoriesHandler(req, res)
);
userRouter.get("/user/poll-invitations", requireUser, listUserPollInvitationsHandler);
userRouter.get("/user/polls", requireUser, listUserPollsHandler);
userRouter.get("/user/polls/:id", requireUser, getUserPollDetailHandler);
userRouter.post("/user/polls", requireUser, createUserPollHandler);
userRouter.post(
	"/user/poll-option-images",
	requireUser,
	userPollOptionUpload.single("image"),
	uploadUserPollOptionImageHandler,
);
userRouter.post(
	"/user/groups/:id/photo",
	requireUser,
	userGroupPhotoUpload.single("photo"),
	uploadUserGroupPhotoHandler,
);
userRouter.post("/user/polls/:id/invites", requireUser, createUserPollInvitesHandler);
userRouter.post("/user/polls/:id/owner-invite", requireUser, createUserPollOwnerInviteHandler);
userRouter.post("/user/polls/:id/end", requireUser, endUserPollHandler);
userRouter.post("/user/polls/:id/extend", requireUser, extendUserPollHandler);
userRouter.post("/user/open-polls/:id/join", requireUser, joinOpenUserPollHandler);
userRouter.get("/user/groups", requireUser, listUserGroupsHandler);
userRouter.post("/user/groups", requireUser, createUserGroupHandler);
userRouter.patch("/user/groups/:id", requireUser, updateUserGroupHandler);
