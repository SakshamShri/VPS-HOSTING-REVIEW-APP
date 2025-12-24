import type { Poll } from "@prisma/client";

import { pollRepository } from "../repositories/poll.repository";
import { categoryRepository } from "../repositories/category.repository";
import { pollConfigRepository } from "../repositories/pollConfig.repository";
import { inheritanceService } from "./inheritance.service";
import type {
  PollCreateDTO,
  PollDetailDTO,
  PollDetailForVoteDTO,
  PollFeedItemDTO,
  PollId,
  PollListItemDTO,
  PollUpdateDTO,
} from "../types/poll.types";
import type { CategoryId } from "../types/category.types";
import type { PollConfigId } from "../types/pollConfig.types";

function buildCategoryPath(category: any): string {
  if (!category) return "";
  if (category.parent) {
    return `${category.parent.name_en} > ${category.name_en}`;
  }
  return category.name_en;
}

function toListDTO(poll: any): PollListItemDTO {
  return {
    id: poll.id as PollId,
    title: poll.title,
    status: poll.status,
    category_id: poll.category_id as CategoryId,
    poll_config_id: poll.poll_config_id as PollConfigId,
    category_path: buildCategoryPath(poll.category),
    poll_config_name: poll.pollConfig?.name ?? "",
    start_at: poll.start_at ?? null,
    end_at: poll.end_at ?? null,
  };
}

function toDetailDTO(poll: any): PollDetailDTO {
  return {
    id: poll.id as PollId,
    title: poll.title,
    description: poll.description ?? null,
    status: poll.status,
    category_id: poll.category_id as CategoryId,
    poll_config_id: poll.poll_config_id as PollConfigId,
    category_path: buildCategoryPath(poll.category),
    poll_config_name: poll.pollConfig?.name ?? "",
    start_at: poll.start_at ?? null,
    end_at: poll.end_at ?? null,
    created_at: poll.created_at,
    updated_at: poll.updated_at,
  };
}

async function ensureChildActiveCategory(categoryId: CategoryId): Promise<void> {
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

  // Enforce effective category permissions (claimable + request_allowed)
  const effective = await inheritanceService.resolveEffectiveCategory(categoryId);
  if (!effective) {
    throw new Error("CATEGORY_NOT_FOUND");
  }
  const { effectiveClaimable, effectiveRequestAllowed, effectiveStatus } = effective;
  if (effectiveStatus !== "ACTIVE") {
    throw new Error("CATEGORY_NOT_ACTIVE");
  }
  if (effectiveClaimable !== "YES" || effectiveRequestAllowed !== "YES") {
    throw new Error("CATEGORY_NOT_ALLOWED");
  }
}

async function ensureActivePollConfig(pollConfigId: PollConfigId): Promise<void> {
  const cfg = await pollConfigRepository.findById(pollConfigId);
  if (!cfg) {
    throw new Error("CONFIG_NOT_FOUND");
  }
  if (cfg.status !== "ACTIVE") {
    throw new Error("CONFIG_NOT_ACTIVE");
  }
}

export class PollService {
  async create(input: PollCreateDTO): Promise<Poll> {
    await ensureChildActiveCategory(input.category_id as CategoryId);
    await ensureActivePollConfig(input.poll_config_id as PollConfigId);

    return pollRepository.create(input);
  }

  async update(id: PollId, input: PollUpdateDTO): Promise<Poll> {
    const existing = await pollRepository.findById(id);
    if (!existing) {
      throw new Error("NOT_FOUND");
    }
    if (existing.status !== "DRAFT") {
      throw new Error("NOT_EDITABLE");
    }

    const next: PollUpdateDTO = { ...input };

    if (next.category_id != null) {
      await ensureChildActiveCategory(next.category_id as CategoryId);
    }
    if (next.poll_config_id != null) {
      await ensureActivePollConfig(next.poll_config_id as PollConfigId);
    }

    return pollRepository.update(id, next);
  }

  async list(): Promise<PollListItemDTO[]> {
    const items = await pollRepository.listWithRelations();
    return items.map(toListDTO);
  }

	async listForUserFeed(): Promise<PollFeedItemDTO[]> {
		const items = await pollRepository.listWithRelations();
		const now = new Date();

		const result: PollFeedItemDTO[] = [];

		for (const poll of items) {
			// Only published (live) polls
			if (poll.status !== "PUBLISHED") continue;

			// Start time: if set and in the future, skip
			if (poll.start_at && poll.start_at > now) continue;

			// Category must be ACTIVE
			if (!poll.category || poll.category.status !== "ACTIVE") continue;

			// Enforce effective category status via inheritance
			const effective = await inheritanceService.resolveEffectiveCategory(
				poll.category_id as CategoryId,
			);
			if (!effective || effective.effectiveStatus !== "ACTIVE") continue;

			// Visibility and inviteOnly come from PollConfig.permissions
			const cfg = poll.pollConfig as any;
			const perms = ((cfg?.permissions as any) ?? {}) as {
				visibility?: string;
				inviteOnly?: boolean;
			};
			const visibility = perms.visibility ?? "PUBLIC";
			if (visibility !== "PUBLIC") continue;
			if (perms.inviteOnly === true) continue;

			result.push({
				id: poll.id as PollId,
				title: poll.title,
				description: poll.description ?? null,
				status: poll.status,
				category_name: poll.category.name_en,
				start_at: poll.start_at ?? null,
				end_at: poll.end_at ?? null,
			});
		}

		return result;
	}

  async getById(id: PollId): Promise<PollDetailDTO | null> {
    const poll = await pollRepository.findByIdWithRelations(id);
    if (!poll) return null;
    return toDetailDTO(poll);
  }

  async getForVote(id: PollId): Promise<PollDetailForVoteDTO | null> {
    const poll = await pollRepository.findByIdWithRelations(id);
    if (!poll) return null;

    const cfg = poll.pollConfig as any;
    const themeJson = (cfg?.theme ?? {}) as any;
    const rulesJson = (cfg?.rules ?? {}) as any;

    // Fallback colors roughly aligned with the emerald preview theme
    const primaryColor: string = themeJson.primaryColor ?? "#059669";
    const accentColor: string = themeJson.accentColor ?? "#ECFDF5";
    const backgroundColor: string =
      themeJson.backgroundColor ?? "#020617"; // near-slate-950
    const textColor: string = themeJson.textColor ?? "#E5E7EB"; // slate-200

    return {
      id: poll.id as PollId,
      title: poll.title,
      description: poll.description ?? null,
      status: poll.status,
      start_at: poll.start_at ?? null,
      end_at: poll.end_at ?? null,
      poll_config: {
        templateType: String(cfg?.ui_template ?? "STANDARD_LIST"),
        theme: {
          primaryColor,
          accentColor,
          backgroundColor,
          textColor,
        },
        rules: rulesJson,
      },
    };
  }

  async publish(id: PollId): Promise<Poll> {
    const existing = await pollRepository.findById(id);
    if (!existing) {
      throw new Error("NOT_FOUND");
    }
    if (existing.status !== "DRAFT") {
      throw new Error("INVALID_STATUS");
    }

    await ensureChildActiveCategory(existing.category_id as CategoryId);
    await ensureActivePollConfig(existing.poll_config_id as PollConfigId);

    return pollRepository.update(id, {
      status: "PUBLISHED",
      start_at: existing.start_at ?? new Date(),
    });
  }

  async close(id: PollId): Promise<Poll> {
    const existing = await pollRepository.findById(id);
    if (!existing) {
      throw new Error("NOT_FOUND");
    }
    if (existing.status !== "PUBLISHED") {
      throw new Error("INVALID_STATUS");
    }

    return pollRepository.update(id, {
      status: "CLOSED",
      end_at: existing.end_at ?? new Date(),
    });
  }
}

export const pollService = new PollService();
