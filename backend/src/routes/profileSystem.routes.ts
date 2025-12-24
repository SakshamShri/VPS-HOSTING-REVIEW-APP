import { Router } from "express";

import { requireAdmin, requireUser } from "../middleware/auth.middleware";
import { profileSystemController } from "../controllers/profileSystem.controller";
import { profileSubmissionUpload } from "../utils/profileUpload";
import { profilePhotoUpload } from "../utils/profilePhotoUpload";

export const profileSystemRouter = Router();

profileSystemRouter.get("/profile/categories/tree", requireAdmin, (req, res) =>
  profileSystemController.adminListCategories(req, res)
);
profileSystemRouter.post("/profile/categories", requireAdmin, (req, res) =>
  profileSystemController.adminCreateCategory(req, res)
);
profileSystemRouter.put("/profile/categories/:id", requireAdmin, (req, res) =>
  profileSystemController.adminUpdateCategory(req, res)
);

profileSystemRouter.get("/profile/profiles", requireAdmin, (req, res) =>
  profileSystemController.adminListProfiles(req, res)
);
profileSystemRouter.post("/profile/profiles", requireAdmin, (req, res) =>
  profileSystemController.adminCreateProfile(req, res)
);
profileSystemRouter.put("/profile/profiles/:id", requireAdmin, (req, res) =>
  profileSystemController.adminUpdateProfile(req, res)
);
profileSystemRouter.post(
  "/profile/profiles/:id/photo",
  requireAdmin,
  profilePhotoUpload.single("photo"),
  (req, res) => profileSystemController.adminUploadProfilePhoto(req, res)
);

profileSystemRouter.get("/profile/review/claims", requireAdmin, (req, res) =>
  profileSystemController.adminListClaims(req, res)
);
profileSystemRouter.post("/profile/review/claims/:id/approve", requireAdmin, (req, res) =>
  profileSystemController.adminApproveClaim(req, res)
);
profileSystemRouter.post("/profile/review/claims/:id/reject", requireAdmin, (req, res) =>
  profileSystemController.adminRejectClaim(req, res)
);

profileSystemRouter.get("/profile/review/requests", requireAdmin, (req, res) =>
  profileSystemController.adminListRequests(req, res)
);
profileSystemRouter.post("/profile/review/requests/:id/approve", requireAdmin, (req, res) =>
  profileSystemController.adminApproveRequest(req, res)
);
profileSystemRouter.post("/profile/review/requests/:id/reject", requireAdmin, (req, res) =>
  profileSystemController.adminRejectRequest(req, res)
);

profileSystemRouter.get("/profile/review/documents/:id/download", requireAdmin, (req, res) =>
  profileSystemController.adminDownloadDocument(req, res)
);

profileSystemRouter.get("/user/profile/categories/tree", requireUser, (req, res) =>
  profileSystemController.userListCategories(req, res)
);
profileSystemRouter.get("/user/profile/categories/:id/profiles", requireUser, (req, res) =>
  profileSystemController.userListProfilesInCategory(req, res)
);

profileSystemRouter.post(
  "/user/profile/profiles/:id/claim",
  requireUser,
  profileSubmissionUpload.any(),
  (req, res) => profileSystemController.userSubmitClaim(req, res)
);
profileSystemRouter.post(
  "/user/profile/categories/:id/request",
  requireUser,
  profileSubmissionUpload.any(),
  (req, res) => profileSystemController.userSubmitRequest(req, res)
);

profileSystemRouter.get("/user/profile/submissions", requireUser, (req, res) =>
  profileSystemController.userListSubmissions(req, res)
);

profileSystemRouter.get("/user/public-profiles", requireUser, (req, res) =>
  profileSystemController.userListPublicProfiles(req, res)
);
profileSystemRouter.get("/user/public-profiles/:id", requireUser, (req, res) =>
  profileSystemController.userGetPublicProfile(req, res)
);

profileSystemRouter.post("/user/public-profiles/:id/follow", requireUser, (req, res) =>
  profileSystemController.userFollowProfile(req, res)
);
profileSystemRouter.post("/user/public-profiles/:id/unfollow", requireUser, (req, res) =>
  profileSystemController.userUnfollowProfile(req, res)
);

profileSystemRouter.get("/user/profile/documents/:id/download", requireUser, (req, res) =>
  profileSystemController.userDownloadDocument(req, res)
);
