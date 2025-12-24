import fs from "fs";
import path from "path";
import multer from "multer";
import { randomUUID } from "crypto";

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const uploadsRoot = path.join(process.cwd(), "uploads", "profile-submissions");

const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    ensureDir(uploadsRoot);
    cb(null, uploadsRoot);
  },
  filename: (_req: any, file: any, cb: any) => {
    const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9._-]+/g, "-");
    cb(null, `${randomUUID()}-${safeOriginal}`);
  },
});

export const profileSubmissionUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10,
  },
});
