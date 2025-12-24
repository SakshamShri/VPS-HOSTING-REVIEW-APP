import { Router } from "express";

import { categoryController } from "../controllers/category.controller";
import { requireAdmin } from "../middleware/auth.middleware";

export const categoryRouter = Router();

categoryRouter.post("/categories", requireAdmin, (req, res) =>
  categoryController.create(req, res)
);
categoryRouter.put("/categories/:id", requireAdmin, (req, res) =>
  categoryController.update(req, res)
);
categoryRouter.delete("/categories/:id", requireAdmin, (req, res) =>
  categoryController.delete(req, res)
);
categoryRouter.get("/categories/tree", requireAdmin, (req, res) =>
  categoryController.getTree(req, res)
);
categoryRouter.get("/categories/:id/effective", requireAdmin, (req, res) =>
  categoryController.getEffective(req, res)
);
categoryRouter.post("/categories/:id/preview-impact", requireAdmin, (req, res) =>
  categoryController.previewImpact(req, res)
);
