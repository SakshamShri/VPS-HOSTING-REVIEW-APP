import type { Request, Response } from "express";

import { prisma } from "../utils/db";

export class HealthController {
  async check(_req: Request, res: Response) {
    const startedAt = process.uptime();
    const now = new Date();

    let dbOk = false;
    let pollConfigsOk = false;

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {
      dbOk = false;
    }

    try {
      await prisma.pollConfig.count({ take: 1 as any });
      pollConfigsOk = true;
    } catch {
      pollConfigsOk = false;
    }

    res.json({
      status: "ok",
      uptimeSeconds: startedAt,
      timestamp: now.toISOString(),
      checks: {
        server: true,
        database: dbOk,
        prisma: dbOk,
        pollConfigs: pollConfigsOk,
      },
    });
  }
}

export const healthController = new HealthController();
