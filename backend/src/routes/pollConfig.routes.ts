import { Router } from "express";

import { pollConfigController } from "../controllers/pollConfig.controller";
import { requireAdmin } from "../middleware/auth.middleware";

export const pollConfigRouter = Router();

pollConfigRouter.post("/poll-configs", requireAdmin, (req, res) =>
  pollConfigController.create(req, res)
);
pollConfigRouter.put("/poll-configs/:id", requireAdmin, (req, res) =>
  pollConfigController.update(req, res)
);
pollConfigRouter.get("/poll-configs", requireAdmin, (req, res) =>
  pollConfigController.list(req, res)
);
pollConfigRouter.get("/poll-configs/:id", requireAdmin, (req, res) =>
  pollConfigController.getById(req, res)
);
pollConfigRouter.post("/poll-configs/:id/clone", requireAdmin, (req, res) =>
  pollConfigController.clone(req, res)
);
pollConfigRouter.post("/poll-configs/:id/publish", requireAdmin, (req, res) =>
  pollConfigController.publish(req, res)
);
