"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryService = exports.CategoryService = void 0;
const category_repository_1 = require("../repositories/category.repository");
const inheritance_service_1 = require("./inheritance.service");
function buildTree(all) {
    const nodes = new Map();
    const roots = [];
    for (const c of all) {
        nodes.set(c.id, {
            id: c.id,
            name_en: c.name_en,
            is_parent: c.is_parent,
            status: c.status,
            children: [],
        });
    }
    for (const c of all) {
        const node = nodes.get(c.id);
        if (c.parent_id && nodes.has(c.parent_id)) {
            nodes.get(c.parent_id).children.push(node);
        }
        else {
            roots.push(node);
        }
    }
    return roots;
}
class CategoryService {
    async createCategory(payload) {
        return category_repository_1.categoryRepository.create(payload);
    }
    async updateCategory(id, payload) {
        return category_repository_1.categoryRepository.update(id, payload);
    }
    async deleteCategory(id) {
        const children = await category_repository_1.categoryRepository.findChildren(id);
        if (children.length > 0) {
            const err = new Error("CATEGORY_HAS_CHILDREN");
            err.code = "CATEGORY_HAS_CHILDREN";
            throw err;
        }
        await category_repository_1.categoryRepository.delete(id);
    }
    async getCategoryTree(domain = "POLL") {
        const flat = await category_repository_1.categoryRepository.findTree(domain);
        return buildTree(flat);
    }
    async getEffectiveCategory(id) {
        return inheritance_service_1.inheritanceService.resolveEffectiveCategory(id);
    }
    async previewImpact(parentId, newDefaults) {
        return inheritance_service_1.inheritanceService.previewCategoryImpact(parentId, newDefaults);
    }
}
exports.CategoryService = CategoryService;
exports.categoryService = new CategoryService();
