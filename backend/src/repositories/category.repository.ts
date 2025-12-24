import type { Category, CategoryStatus, Prisma } from "@prisma/client";

import { prisma } from "../utils/db";
import type { CategoryCreateDTO, CategoryId, CategoryUpdateDTO } from "../types/category.types";

type CategoryWithParent = Prisma.CategoryGetPayload<{ include: { parent: true } }>;

type CategoryDomain = "POLL" | "PROFILE";

export class CategoryRepository {
  async create(data: CategoryCreateDTO): Promise<Category> {
    return prisma.category.create({ data });
  }

  async update(id: CategoryId, data: CategoryUpdateDTO): Promise<Category> {
    const { parent_id, ...rest } = data;

    const updateData: Prisma.CategoryUpdateInput = {
      ...(rest as any),
    };

    if (parent_id !== undefined) {
      if (parent_id === null) {
        (updateData as any).parent = { disconnect: true };
      } else {
        (updateData as any).parent = { connect: { id: parent_id } };
      }
    }

    return prisma.category.update({ where: { id }, data: updateData });
  }

  async delete(id: CategoryId): Promise<void> {
    await prisma.category.delete({ where: { id } });
  }

  async findById(id: CategoryId): Promise<Category | null> {
    return prisma.category.findUnique({ where: { id } });
  }

  async findByIdWithParent(id: CategoryId): Promise<CategoryWithParent | null> {
    return prisma.category.findUnique({ where: { id }, include: { parent: true } });
  }

  async findChildren(parentId: CategoryId, domain?: CategoryDomain): Promise<Category[]> {
    return prisma.category.findMany({
      where: ({
        parent_id: parentId,
        ...(domain ? { domain } : {}),
      } as any),
    });
  }

  async findTree(domain?: CategoryDomain): Promise<Category[]> {
    const categories = await prisma.category.findMany({
      where: ({
        ...(domain ? { domain } : {}),
      } as any),
      orderBy: { display_order: "asc" },
    });
    return categories;
  }

  async findActiveChildrenForImpact(parentId: CategoryId, domain?: CategoryDomain): Promise<Category[]> {
    return prisma.category.findMany({
      where: ({
        parent_id: parentId,
        ...(domain ? { domain } : {}),
        status: { in: ["ACTIVE" as CategoryStatus, "DISABLED" as CategoryStatus] },
      } as any),
      orderBy: { display_order: "asc" },
    });
  }
}

export const categoryRepository = new CategoryRepository();
