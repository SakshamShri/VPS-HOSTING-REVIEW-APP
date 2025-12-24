"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollConfigService = exports.PollConfigService = void 0;
const pollConfig_repository_1 = require("../repositories/pollConfig.repository");
const category_repository_1 = require("../repositories/category.repository");
const pollConfig_validator_1 = require("../validators/pollConfig.validator");
function toSlug(name) {
    return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
}
async function generateUniqueSlug(baseName) {
    const baseSlug = toSlug(baseName) || "poll-config";
    let slug = baseSlug;
    let suffix = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const existing = await pollConfig_repository_1.pollConfigRepository.findBySlug(slug);
        if (!existing)
            return slug;
        slug = `${baseSlug}-${suffix++}`;
    }
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
}
class PollConfigService {
    async create(input) {
        const template = pollConfig_validator_1.pollUiTemplateSchema.parse(input.ui_template);
        (0, pollConfig_validator_1.validateTemplateRules)(template, input.rules);
        await ensureChildActiveCategory(input.category_id);
        const slug = await generateUniqueSlug(input.name);
        const payload = {
            ...input,
            slug,
            version: 1,
        };
        return pollConfig_repository_1.pollConfigRepository.create(payload);
    }
    async update(id, input) {
        const existing = await pollConfig_repository_1.pollConfigRepository.findById(id);
        if (!existing) {
            throw new Error("NOT_FOUND");
        }
        const merged = {
            ...input,
        };
        const template = pollConfig_validator_1.pollUiTemplateSchema.parse((merged.ui_template ?? existing.ui_template));
        (0, pollConfig_validator_1.validateTemplateRules)(template, (merged.rules ?? existing.rules));
        if (merged.category_id != null) {
            await ensureChildActiveCategory(merged.category_id);
        }
        const nextVersion = existing.version + 1;
        return pollConfig_repository_1.pollConfigRepository.update(id, {
            ...merged,
            version: nextVersion,
        });
    }
    async list() {
        return pollConfig_repository_1.pollConfigRepository.list();
    }
    async getById(id) {
        return pollConfig_repository_1.pollConfigRepository.findById(id);
    }
    async clone(id) {
        const existing = await pollConfig_repository_1.pollConfigRepository.findById(id);
        if (!existing) {
            throw new Error("NOT_FOUND");
        }
        const slug = await generateUniqueSlug(`${existing.name}-copy`);
        const payload = {
            name: `${existing.name} (Copy)`,
            slug,
            status: "DRAFT",
            category_id: existing.category_id,
            ui_template: existing.ui_template,
            theme: existing.theme,
            rules: existing.rules,
            permissions: existing.permissions,
            version: 1,
        };
        return pollConfig_repository_1.pollConfigRepository.create(payload);
    }
    async publish(id) {
        const existing = await pollConfig_repository_1.pollConfigRepository.findById(id);
        if (!existing) {
            throw new Error("NOT_FOUND");
        }
        const nextVersion = existing.version + 1;
        return pollConfig_repository_1.pollConfigRepository.update(id, {
            status: "ACTIVE",
            version: nextVersion,
        });
    }
}
exports.PollConfigService = PollConfigService;
exports.pollConfigService = new PollConfigService();
