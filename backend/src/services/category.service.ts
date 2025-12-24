import type { Category } from "@prisma/client";

import { categoryRepository } from "../repositories/category.repository";
import { inheritanceService } from "./inheritance.service";
import type {
  CategoryCreateDTO,
  CategoryId,
  CategoryTreeNodeDTO,
  CategoryUpdateDTO,
  EffectiveCategoryValues,
  ImpactPreviewResult,
  ParentDefaultsInput,
} from "../types/category.types";

type CategoryDomain = "POLL" | "PROFILE";

function buildTree(all: Category[]): CategoryTreeNodeDTO[] {
  const nodes = new Map<CategoryId, CategoryTreeNodeDTO>();
  const roots: CategoryTreeNodeDTO[] = [];

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
    const node = nodes.get(c.id)!;
    if (c.parent_id && nodes.has(c.parent_id)) {
      nodes.get(c.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export class CategoryService {
  async createCategory(payload: CategoryCreateDTO): Promise<Category> {
    return categoryRepository.create(payload);
  }

  async updateCategory(id: CategoryId, payload: CategoryUpdateDTO): Promise<Category> {
    return categoryRepository.update(id, payload);
  }

  async deleteCategory(id: CategoryId): Promise<void> {
    const children = await categoryRepository.findChildren(id);
    if (children.length > 0) {
      const err = new Error("CATEGORY_HAS_CHILDREN");
      (err as any).code = "CATEGORY_HAS_CHILDREN";
      throw err;
    }

    await categoryRepository.delete(id);
  }

  async getCategoryTree(domain: CategoryDomain = "POLL"): Promise<CategoryTreeNodeDTO[]> {
    const flat = await categoryRepository.findTree(domain);
    return buildTree(flat);
  }

  async getEffectiveCategory(id: CategoryId): Promise<EffectiveCategoryValues | null> {
    return inheritanceService.resolveEffectiveCategory(id);
  }

  async previewImpact(
    parentId: CategoryId,
    newDefaults: ParentDefaultsInput
  ): Promise<ImpactPreviewResult> {
    return inheritanceService.previewCategoryImpact(parentId, newDefaults);
  }
}

export const categoryService = new CategoryService();
