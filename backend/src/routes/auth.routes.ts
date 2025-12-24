import { Router } from "express";

import { requireUser } from "../middleware/auth.middleware";
import { firebaseLoginHandler } from "../controllers/firebaseAuth.controller";
import {
  adminLoginHandler,
  otpSendHandler,
  otpVerifyHandler,
  verifyIdentityHandler,
} from "../controllers/auth.controller";

export const authRouter = Router();

authRouter.post("/auth/admin/login", adminLoginHandler);
authRouter.post("/auth/otp/send", otpSendHandler);
authRouter.post("/auth/otp/verify", otpVerifyHandler);
authRouter.post("/auth/verify-identity", requireUser, verifyIdentityHandler);
authRouter.post("/auth/firebase-login", firebaseLoginHandler);
