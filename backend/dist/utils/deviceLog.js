"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logDeviceLogin = logDeviceLogin;
const ua_parser_js_1 = __importDefault(require("ua-parser-js"));
const db_1 = require("./db");
async function logDeviceLogin({ req, userId, role }) {
    try {
        const userAgent = req.headers["user-agent"] ?? "";
        const ipHeader = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ?? null;
        const ipAddress = ipHeader || (req.ip || req.socket.remoteAddress || null);
        const parser = new ua_parser_js_1.default(userAgent);
        const device = parser.getDevice();
        const osInfo = parser.getOS();
        const browserInfo = parser.getBrowser();
        const deviceType = device.type || "desktop";
        const os = osInfo.name ? `${osInfo.name}${osInfo.version ? " " + osInfo.version : ""}` : null;
        const browser = browserInfo.name
            ? `${browserInfo.name}${browserInfo.version ? " " + browserInfo.version : ""}`
            : null;
        // Detect if this is a new device for this user+role combination, ignoring IP.
        const existing = await db_1.prisma.deviceLog.findFirst({
            where: {
                user_id: userId ?? null,
                role,
                device_type: deviceType,
                os,
                browser,
            },
        });
        const isNew = !existing;
        await db_1.prisma.deviceLog.create({
            data: {
                user_id: userId ?? null,
                role,
                ip_address: ipAddress ?? null,
                user_agent: userAgent || null,
                device_type: deviceType,
                os,
                browser,
                is_new_device: isNew,
            },
        });
    }
    catch (err) {
        // Best-effort logging only; never block login on failure.
        // eslint-disable-next-line no-console
        console.error("Failed to log device info", err);
    }
}
