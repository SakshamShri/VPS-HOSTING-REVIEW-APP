import { Router } from "express";

import { requireUser } from "../middleware/auth.middleware";
import { psiController } from "../controllers/psi.controller";

export const psiRouter = Router();

psiRouter.post("/user/psi/profiles/:id/vote", requireUser, (req, res) =>
  psiController.userSubmitVote(req, res)
);

psiRouter.get("/user/psi/trending", requireUser, (req, res) =>
  psiController.userTrending(req, res)
);
