import express from "express";
import cors from "cors";

import { categoryRouter } from "./routes/category.routes";
import { pollConfigRouter } from "./routes/pollConfig.routes";
import { pollRouter } from "./routes/poll.routes";
import { healthRouter } from "./routes/health.routes";
import { authRouter } from "./routes/auth.routes";
import { userRouter } from "./routes/user.routes";
import { inviteRouter } from "./routes/invite.routes";
import { profileSystemRouter } from "./routes/profileSystem.routes";

export function createApp() {
  const app = express();

  const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

  app.use(
    cors({
      origin: FRONTEND_ORIGIN,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      credentials: true,
      optionsSuccessStatus: 204,
    })
  );

  // Explicitly handle CORS preflight for all routes
  app.options("*", cors({
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    optionsSuccessStatus: 204,
  }));

  app.use(express.json());

  app.use(healthRouter);
  app.use(categoryRouter);
  app.use(pollConfigRouter);
  app.use(pollRouter);
  app.use(authRouter);
  app.use(userRouter);
  app.use(inviteRouter);
  app.use(profileSystemRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // Minimal error handler for now
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  });

  return app;
}
