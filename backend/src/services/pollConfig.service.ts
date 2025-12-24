import type { PollConfig } from "@prisma/client";

import { pollConfigRepository } from "../repositories/pollConfig.repository";
import { categoryRepository } from "../repositories/category.repository";
import type {
  PollConfigCreateDTO,
  PollConfigId,
  PollConfigUpdateDTO,
} from "../types/pollConfig.types";
import { pollUiTemplateSchema, validateTemplateRules } from "../validators/pollConfig.validator";

function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function generateUniqueSlug(baseName: string): Promise<string> {
  const baseSlug = toSlug(baseName) || "poll-config";
  let slug = baseSlug;
  let suffix = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await pollConfigRepository.findBySlug(slug);
    if (!existing) return slug;
    slug = `${baseSlug}-${suffix++}`;
  }
}

async function ensureChildActiveCategory(categoryId: PollConfigId): Promise<void> {
  const category = await categoryRepository.findById(categoryId);
  if (!category) {
    throw new Error("CATEGORY_NOT_FOUND");
  }
  if ((category as any).domain && (category as any).domain !== "POLL") {
    throw new Error("CATEGORY_NOT_FOUND");
  }
  if (category.is_parent) {
    throw new Error("CATEGORY_NOT_CHILD");
  }
  if (category.status !== "ACTIVE") {
    throw new Error("CATEGORY_NOT_ACTIVE");
  }
}

export class PollConfigService {
  async create(input: Omit<PollConfigCreateDTO, "slug" | "version">): Promise<PollConfig> {
    const template = pollUiTemplateSchema.parse(input.ui_template);
    validateTemplateRules(template, input.rules as any);

    await ensureChildActiveCategory(input.category_id);

    const slug = await generateUniqueSlug(input.name);

    const payload: PollConfigCreateDTO = {
      ...input,
      slug,
      version: 1,
    };

    return pollConfigRepository.create(payload);
  }

  async update(id: PollConfigId, input: PollConfigUpdateDTO): Promise<PollConfig> {
    const existing = await pollConfigRepository.findById(id);
    if (!existing) {
      throw new Error("NOT_FOUND");
    }

    const merged: PollConfigUpdateDTO = {
      ...input,
    };

    const template = pollUiTemplateSchema.parse(
      (merged.ui_template ?? existing.ui_template) as any
    );
    validateTemplateRules(template, (merged.rules ?? (existing.rules as any)) as any);

    if (merged.category_id != null) {
      await ensureChildActiveCategory(merged.category_id as PollConfigId);
    }

    const nextVersion = existing.version + 1;

    return pollConfigRepository.update(id, {
      ...merged,
      version: nextVersion,
    });
  }

  async list(): Promise<PollConfig[]> {
    return pollConfigRepository.list();
  }

  async getById(id: PollConfigId): Promise<PollConfig | null> {
    return pollConfigRepository.findById(id);
  }

  async clone(id: PollConfigId): Promise<PollConfig> {
    const existing = await pollConfigRepository.findById(id);
    if (!existing) {
      throw new Error("NOT_FOUND");
    }

    const slug = await generateUniqueSlug(`${existing.name}-copy`);

    const payload: PollConfigCreateDTO = {
      name: `${existing.name} (Copy)`,
      slug,
      status: "DRAFT",
      category_id: existing.category_id as PollConfigId,
      ui_template: existing.ui_template,
      theme: existing.theme as any,
      rules: existing.rules as any,
      permissions: existing.permissions as any,
      version: 1,
    };

    return pollConfigRepository.create(payload);
  }

  async publish(id: PollConfigId): Promise<PollConfig> {
    const existing = await pollConfigRepository.findById(id);
    if (!existing) {
      throw new Error("NOT_FOUND");
    }

    const nextVersion = existing.version + 1;

    return pollConfigRepository.update(id, {
      status: "ACTIVE",
      version: nextVersion,
    });
  }
}

export const pollConfigService = new PollConfigService();
