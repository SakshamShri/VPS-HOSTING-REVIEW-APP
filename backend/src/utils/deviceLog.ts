import type { Request } from "express";
import UAParser from "ua-parser-js";

import { prisma } from "./db";
import type { AuthRole } from "../types/auth.types";

interface LogDeviceLoginParams {
  req: Request;
  userId: bigint | null;
  role: AuthRole;
}

export async function logDeviceLogin({ req, userId, role }: LogDeviceLoginParams): Promise<void> {
  try {
    const userAgent = (req.headers["user-agent"] as string | undefined) ?? "";
    const ipHeader =
      (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? null;
    const ipAddress = ipHeader || (req.ip || req.socket.remoteAddress || null);

    const parser = new UAParser(userAgent);
    const device = parser.getDevice();
    const osInfo = parser.getOS();
    const browserInfo = parser.getBrowser();

    const deviceType = device.type || "desktop";
    const os = osInfo.name ? `${osInfo.name}${osInfo.version ? " " + osInfo.version : ""}` : null;
    const browser = browserInfo.name
      ? `${browserInfo.name}${browserInfo.version ? " " + browserInfo.version : ""}`
      : null;

    // Detect if this is a new device for this user+role combination, ignoring IP.
    const existing = await prisma.deviceLog.findFirst({
      where: {
        user_id: userId ?? null,
        role,
        device_type: deviceType,
        os,
        browser,
      },
    });

    const isNew = !existing;

    await prisma.deviceLog.create({
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
  } catch (err) {
    // Best-effort logging only; never block login on failure.
    // eslint-disable-next-line no-console
    console.error("Failed to log device info", err);
  }
}
