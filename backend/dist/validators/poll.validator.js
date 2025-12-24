"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollUpdateSchema = exports.pollCreateSchema = exports.pollStatusSchema = void 0;
const zod_1 = require("zod");
exports.pollStatusSchema = zod_1.z.enum(["DRAFT", "PUBLISHED", "CLOSED"]);
exports.pollCreateSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional().nullable(),
    categoryId: zod_1.z.string().min(1),
    pollConfigId: zod_1.z.string().min(1),
    startAt: zod_1.z.string().datetime().optional().nullable(),
    endAt: zod_1.z.string().datetime().optional().nullable(),
});
exports.pollUpdateSchema = exports.pollCreateSchema.partial();
