"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthController = exports.HealthController = void 0;
const db_1 = require("../utils/db");
class HealthController {
    async check(_req, res) {
        const startedAt = process.uptime();
        const now = new Date();
        let dbOk = false;
        let pollConfigsOk = false;
        try {
            await db_1.prisma.$queryRaw `SELECT 1`;
            dbOk = true;
        }
        catch {
            dbOk = false;
        }
        try {
            await db_1.prisma.pollConfig.count({ take: 1 });
            pollConfigsOk = true;
        }
        catch {
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
exports.HealthController = HealthController;
exports.healthController = new HealthController();
