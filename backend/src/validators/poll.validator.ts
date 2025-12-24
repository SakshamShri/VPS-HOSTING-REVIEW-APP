import { z } from "zod";

export const pollStatusSchema = z.enum(["DRAFT", "PUBLISHED", "CLOSED"]);

export const pollCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  categoryId: z.string().min(1),
  pollConfigId: z.string().min(1),
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
});

export const pollUpdateSchema = pollCreateSchema.partial();

export type PollCreateInput = z.infer<typeof pollCreateSchema>;
export type PollUpdateInput = z.infer<typeof pollUpdateSchema>;
