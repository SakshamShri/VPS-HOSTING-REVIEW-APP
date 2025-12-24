"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileRequirementSchema = exports.profileRequirementFieldTypeSchema = void 0;
exports.validateSubmittedDataOrThrow = validateSubmittedDataOrThrow;
const zod_1 = require("zod");
exports.profileRequirementFieldTypeSchema = zod_1.z.enum([
    "text",
    "number",
    "dropdown",
    "url",
    "document",
    "checkbox",
]);
exports.profileRequirementSchema = zod_1.z
    .object({
    fields: zod_1.z
        .array(zod_1.z.object({
        key: zod_1.z.string().min(1),
        label: zod_1.z.string().min(1),
        type: exports.profileRequirementFieldTypeSchema,
        required: zod_1.z.boolean().optional().default(false),
        options: zod_1.z.array(zod_1.z.string().min(1)).optional(),
    }))
        .default([]),
})
    .strict();
function validateSubmittedDataOrThrow(params) {
    const parsedReq = exports.profileRequirementSchema.parse(params.requirements ?? { fields: [] });
    const submitted = (params.submittedData ?? {});
    for (const field of parsedReq.fields) {
        const value = submitted[field.key];
        if (field.type === "document") {
            const hasDoc = params.uploadedDocumentFieldKeys.has(field.key);
            if (field.required && !hasDoc) {
                const err = new Error(`MISSING_REQUIRED_DOCUMENT:${field.key}`);
                err.code = "MISSING_REQUIRED_DOCUMENT";
                throw err;
            }
            continue;
        }
        if (value == null) {
            if (field.required) {
                const err = new Error(`MISSING_REQUIRED_FIELD:${field.key}`);
                err.code = "MISSING_REQUIRED_FIELD";
                throw err;
            }
            continue;
        }
        if (field.type === "text") {
            if (typeof value !== "string" || value.trim().length === 0) {
                const err = new Error(`INVALID_FIELD:${field.key}`);
                err.code = "INVALID_FIELD";
                throw err;
            }
            continue;
        }
        if (field.type === "url") {
            if (typeof value !== "string" || value.trim().length === 0) {
                const err = new Error(`INVALID_FIELD:${field.key}`);
                err.code = "INVALID_FIELD";
                throw err;
            }
            try {
                // eslint-disable-next-line no-new
                new URL(value);
            }
            catch {
                const err = new Error(`INVALID_FIELD:${field.key}`);
                err.code = "INVALID_FIELD";
                throw err;
            }
            continue;
        }
        if (field.type === "number") {
            if (typeof value !== "number" || Number.isNaN(value)) {
                const err = new Error(`INVALID_FIELD:${field.key}`);
                err.code = "INVALID_FIELD";
                throw err;
            }
            continue;
        }
        if (field.type === "checkbox") {
            if (typeof value !== "boolean") {
                const err = new Error(`INVALID_FIELD:${field.key}`);
                err.code = "INVALID_FIELD";
                throw err;
            }
            if (field.required && value !== true) {
                const err = new Error(`INVALID_FIELD:${field.key}`);
                err.code = "INVALID_FIELD";
                throw err;
            }
            continue;
        }
        if (field.type === "dropdown") {
            if (typeof value !== "string" || value.trim().length === 0) {
                const err = new Error(`INVALID_FIELD:${field.key}`);
                err.code = "INVALID_FIELD";
                throw err;
            }
            if (field.options && !field.options.includes(value)) {
                const err = new Error(`INVALID_FIELD:${field.key}`);
                err.code = "INVALID_FIELD";
                throw err;
            }
            continue;
        }
    }
}
