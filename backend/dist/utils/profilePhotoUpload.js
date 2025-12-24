"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.profilePhotoUpload = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const crypto_1 = require("crypto");
function ensureDir(dir) {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
}
const photoUploadsRoot = path_1.default.join(process.cwd(), "uploads", "profile-photos");
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        ensureDir(photoUploadsRoot);
        cb(null, photoUploadsRoot);
    },
    filename: (_req, file, cb) => {
        const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9._-]+/g, "-");
        cb(null, `${(0, crypto_1.randomUUID)()}-${safeOriginal}`);
    },
});
exports.profilePhotoUpload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
});
