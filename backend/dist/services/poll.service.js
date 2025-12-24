"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollService = exports.PollService = void 0;
const poll_repository_1 = require("../repositories/poll.repository");
const category_repository_1 = require("../repositories/category.repository");
const pollConfig_repository_1 = require("../repositories/pollConfig.repository");
const inheritance_service_1 = require("./inheritance.service");
function buildCategoryPath(category) {
    if (!category)
        return "";
    if (category.parent) {
        return `${category.parent.name_en} > ${category.name_en}`;
    }
    return category.name_en;
}
function toListDTO(poll) {
    return {
        id: poll.id,
        title: poll.title,
        status: poll.status,
        category_id: poll.category_id,
        poll_config_id: poll.poll_config_id,
        category_path: buildCategoryPath(poll.category),
        poll_config_name: poll.pollConfig?.name ?? "",
        start_at: poll.start_at ?? null,
        end_at: poll.end_at ?? null,
    };
}
function toDetailDTO(poll) {
    return {
        id: poll.id,
        title: poll.title,
        description: poll.description ?? null,
        status: poll.status,
        category_id: poll.category_id,
        poll_config_id: poll.poll_config_id,
        category_path: buildCategoryPath(poll.category),
        poll_config_name: poll.pollConfig?.name ?? "",
        start_at: poll.start_at ?? null,
        end_at: poll.end_at ?? null,
        created_at: poll.created_at,
        updated_at: poll.updated_at,
    };
}
async function ensureChildActiveCategory(categoryId) {
    const category = await category_repository_1.categoryRepository.findById(categoryId);
    if (!category) {
        throw new Error("CATEGORY_NOT_FOUND");
    }
    if (category.domain && category.domain !== "POLL") {
        throw new Error("CATEGORY_NOT_FOUND");
    }
    if (category.is_parent) {
        throw new Error("CATEGORY_NOT_CHILD");
    }
    if (category.status !== "ACTIVE") {
        throw new Error("CATEGORY_NOT_ACTIVE");
    }
    // Enforce effective category permissions (claimable + request_allowed)
    const effective = await inheritance_service_1.inheritanceService.resolveEffectiveCategory(categoryId);
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
async function ensureActivePollConfig(pollConfigId) {
    const cfg = await pollConfig_repository_1.pollConfigRepository.findById(pollConfigId);
    if (!cfg) {
        throw new Error("CONFIG_NOT_FOUND");
    }
    if (cfg.status !== "ACTIVE") {
        throw new Error("CONFIG_NOT_ACTIVE");
    }
}
class PollService {
    async create(input) {
        await ensureChildActiveCategory(input.category_id);
        await ensureActivePollConfig(input.poll_config_id);
        return poll_repository_1.pollRepository.create(input);
    }
    async update(id, input) {
        const existing = await poll_repository_1.pollRepository.findById(id);
        if (!existing) {
            throw new Error("NOT_FOUND");
        }
        if (existing.status !== "DRAFT") {
            throw new Error("NOT_EDITABLE");
        }
        const next = { ...input };
        if (next.category_id != null) {
            await ensureChildActiveCategory(next.category_id);
        }
        if (next.poll_config_id != null) {
            await ensureActivePollConfig(next.poll_config_id);
        }
        return poll_repository_1.pollRepository.update(id, next);
    }
    async list() {
        const items = await poll_repository_1.pollRepository.listWithRelations();
        return items.map(toListDTO);
    }
    async listForUserFeed() {
        const items = await poll_repository_1.pollRepository.listWithRelations();
        const now = new Date();
        const result = [];
        for (const poll of items) {
            // Only published (live) polls
            if (poll.status !== "PUBLISHED")
                continue;
            // Start time: if set and in the future, skip
            if (poll.start_at && poll.start_at > now)
                continue;
            // Category must be ACTIVE
            if (!poll.category || poll.category.status !== "ACTIVE")
                continue;
            // Enforce effective category status via inheritance
            const effective = await inheritance_service_1.inheritanceService.resolveEffectiveCategory(poll.category_id);
            if (!effective || effective.effectiveStatus !== "ACTIVE")
                continue;
            // Visibility and inviteOnly come from PollConfig.permissions
            const cfg = poll.pollConfig;
            const perms = (cfg?.permissions ?? {});
            const visibility = perms.visibility ?? "PUBLIC";
            if (visibility !== "PUBLIC")
                continue;
            if (perms.inviteOnly === true)
                continue;
            result.push({
                id: poll.id,
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
    async getById(id) {
        const poll = await poll_repository_1.pollRepository.findByIdWithRelations(id);
        if (!poll)
            return null;
        return toDetailDTO(poll);
    }
    async getForVote(id) {
        const poll = await poll_repository_1.pollRepository.findByIdWithRelations(id);
        if (!poll)
            return null;
        const cfg = poll.pollConfig;
        const themeJson = (cfg?.theme ?? {});
        const rulesJson = (cfg?.rules ?? {});
        // Fallback colors roughly aligned with the emerald preview theme
        const primaryColor = themeJson.primaryColor ?? "#059669";
        const accentColor = themeJson.accentColor ?? "#ECFDF5";
        const backgroundColor = themeJson.backgroundColor ?? "#020617"; // near-slate-950
        const textColor = themeJson.textColor ?? "#E5E7EB"; // slate-200
        return {
            id: poll.id,
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
    async publish(id) {
        const existing = await poll_repository_1.pollRepository.findById(id);
        if (!existing) {
            throw new Error("NOT_FOUND");
        }
        if (existing.status !== "DRAFT") {
            throw new Error("INVALID_STATUS");
        }
        await ensureChildActiveCategory(existing.category_id);
        await ensureActivePollConfig(existing.poll_config_id);
        return poll_repository_1.pollRepository.update(id, {
            status: "PUBLISHED",
            start_at: existing.start_at ?? new Date(),
        });
    }
    async close(id) {
        const existing = await poll_repository_1.pollRepository.findById(id);
        if (!existing) {
            throw new Error("NOT_FOUND");
        }
        if (existing.status !== "PUBLISHED") {
            throw new Error("INVALID_STATUS");
        }
        return poll_repository_1.pollRepository.update(id, {
            status: "CLOSED",
            end_at: existing.end_at ?? new Date(),
        });
    }
}
exports.PollService = PollService;
exports.pollService = new PollService();
