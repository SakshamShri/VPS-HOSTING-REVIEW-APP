"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollConfigUpdateSchema = exports.pollConfigCreateSchema = exports.pollUiTemplateSchema = exports.pollConfigStatusSchema = void 0;
exports.validateTemplateRules = validateTemplateRules;
const zod_1 = require("zod");
exports.pollConfigStatusSchema = zod_1.z.enum(["DRAFT", "ACTIVE", "DISABLED"]);
exports.pollUiTemplateSchema = zod_1.z.enum([
    "STANDARD_LIST",
    "YES_NO",
    "RATING",
    "SWIPE",
    "POINT_ALLOC",
    "MEDIA_COMPARE",
]);
const themeSchema = zod_1.z.object({
    primaryColor: zod_1.z.string().min(1),
    accentColor: zod_1.z.string().min(1),
});
const contentRulesSchema = zod_1.z
    .object({
    minOptions: zod_1.z.number().int().min(2).max(20).optional(),
    maxOptions: zod_1.z.number().int().min(2).max(20).optional(),
})
    .optional();
const votingBehaviorSchema = zod_1.z
    .object({
    allowMultipleVotes: zod_1.z.boolean().optional(),
    allowAbstain: zod_1.z.boolean().optional(),
})
    .optional();
const resultsRulesSchema = zod_1.z
    .object({
    showResults: zod_1.z.boolean().optional(),
    showWhileOpen: zod_1.z.boolean().optional(),
})
    .optional();
const permissionsSchema = zod_1.z.object({
    visibility: zod_1.z.enum(["PUBLIC", "INTERNAL", "PRIVATE"]).optional(),
    inviteOnly: zod_1.z.boolean().optional(),
    adminCurated: zod_1.z.boolean().optional(),
});
exports.pollConfigCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    status: exports.pollConfigStatusSchema.optional(),
    categoryId: zod_1.z.string().min(1),
    uiTemplate: exports.pollUiTemplateSchema,
    theme: themeSchema,
    rules: zod_1.z
        .object({
        contentRules: contentRulesSchema,
        votingBehavior: votingBehaviorSchema,
        resultsRules: resultsRulesSchema,
    })
        .default({}),
    permissions: permissionsSchema,
});
exports.pollConfigUpdateSchema = exports.pollConfigCreateSchema
    .omit({ categoryId: true })
    .partial()
    .extend({
    categoryId: zod_1.z.string().min(1).nullable().optional(),
});
function validateTemplateRules(template, rules) {
    const content = rules.contentRules;
    if (!content)
        return;
    const { minOptions, maxOptions } = content;
    if (template === "YES_NO") {
        if ((minOptions && minOptions !== 2) || (maxOptions && maxOptions !== 2)) {
            throw new Error("YES_NO template must have exactly 2 options.");
        }
    }
    if (template === "STANDARD_LIST" || template === "RATING") {
        if (minOptions && minOptions < 2) {
            throw new Error("List and rating templates require at least 2 options.");
        }
    }
}
