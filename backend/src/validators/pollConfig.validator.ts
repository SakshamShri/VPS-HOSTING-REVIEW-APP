import { z } from "zod";

import type { PollUiTemplate } from "@prisma/client";

export const pollConfigStatusSchema = z.enum(["DRAFT", "ACTIVE", "DISABLED"]);

export const pollUiTemplateSchema = z.enum([
  "STANDARD_LIST",
  "YES_NO",
  "RATING",
  "SWIPE",
  "POINT_ALLOC",
  "MEDIA_COMPARE",
]);

const themeSchema = z.object({
  primaryColor: z.string().min(1),
  accentColor: z.string().min(1),
});

const contentRulesSchema = z
  .object({
    minOptions: z.number().int().min(2).max(20).optional(),
    maxOptions: z.number().int().min(2).max(20).optional(),
  })
  .optional();

const votingBehaviorSchema = z
  .object({
    allowMultipleVotes: z.boolean().optional(),
    allowAbstain: z.boolean().optional(),
  })
  .optional();

const resultsRulesSchema = z
  .object({
    showResults: z.boolean().optional(),
    showWhileOpen: z.boolean().optional(),
  })
  .optional();

const permissionsSchema = z.object({
  visibility: z.enum(["PUBLIC", "INTERNAL", "PRIVATE"]).optional(),
  inviteOnly: z.boolean().optional(),
  adminCurated: z.boolean().optional(),
});

export const pollConfigCreateSchema = z.object({
  name: z.string().min(1),
  status: pollConfigStatusSchema.optional(),
  categoryId: z.string().min(1),
  uiTemplate: pollUiTemplateSchema,
  theme: themeSchema,
  rules: z
    .object({
      contentRules: contentRulesSchema,
      votingBehavior: votingBehaviorSchema,
      resultsRules: resultsRulesSchema,
    })
    .default({}),
  permissions: permissionsSchema,
});

export const pollConfigUpdateSchema = pollConfigCreateSchema
  .omit({ categoryId: true })
  .partial()
  .extend({
    categoryId: z.string().min(1).nullable().optional(),
  });

export type PollConfigCreateInput = z.infer<typeof pollConfigCreateSchema>;
export type PollConfigUpdateInput = z.infer<typeof pollConfigUpdateSchema>;

export function validateTemplateRules(
  template: PollUiTemplate,
  rules: z.infer<typeof pollConfigCreateSchema>["rules"]
): void {
  const content = rules.contentRules;
  if (!content) return;

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
