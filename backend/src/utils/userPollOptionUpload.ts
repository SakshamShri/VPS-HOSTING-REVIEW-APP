import fs from "fs";
import path from "path";
import multer from "multer";
import { randomUUID } from "crypto";

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const optionUploadsRoot = path.join(process.cwd(), "uploads", "user-poll-options");

const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    ensureDir(optionUploadsRoot);
    cb(null, optionUploadsRoot);
  },
  filename: (_req: any, file: any, cb: any) => {
    const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9._-]+/g, "-");
    cb(null, `${randomUUID()}-${safeOriginal}`);
  },
});

export const userPollOptionUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});
