import { Router } from "express";

import { pollController } from "../controllers/poll.controller";
import { requireAdmin } from "../middleware/auth.middleware";

export const pollRouter = Router();

pollRouter.post("/polls", requireAdmin, (req, res) => pollController.create(req, res));
pollRouter.put("/polls/:id", requireAdmin, (req, res) => pollController.update(req, res));
pollRouter.get("/polls", requireAdmin, (req, res) => pollController.list(req, res));
pollRouter.get("/polls/:id", requireAdmin, (req, res) => pollController.getById(req, res));
pollRouter.get("/polls/:id/vote-details", (req, res) => pollController.getForVote(req, res));
pollRouter.post("/polls/:id/publish", requireAdmin, (req, res) => pollController.publish(req, res));
pollRouter.post("/polls/:id/close", requireAdmin, (req, res) => pollController.close(req, res));
pollRouter.post("/polls/:id/vote", (req, res) => pollController.vote(req, res));
