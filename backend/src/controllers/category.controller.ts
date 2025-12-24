import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { categoryService } from "../services/category.service";
import type { CategoryId, CategoryUpdateDTO } from "../types/category.types";

const idParamSchema = z.object({ id: z.string() });

const yesNoEnum = z.enum(["YES", "NO"]);
const adminCuratedEnum = z.enum(["YES", "NO", "PARTIAL"]);
const statusEnum = z.enum(["ACTIVE", "DISABLED"]);

const categoryCreateSchema = z.object({
  name_en: z.string().min(1),
  name_local: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  is_parent: z.boolean(),
  parent_id: z.string().optional().nullable(),
  claimable_default: yesNoEnum,
  request_allowed_default: yesNoEnum,
  admin_curated_default: adminCuratedEnum,
  claimable: yesNoEnum.optional().nullable(),
  request_allowed: yesNoEnum.optional().nullable(),
  admin_curated: adminCuratedEnum.optional().nullable(),
  status: statusEnum,
  display_order: z.number().int().optional(),
  notes: z.string().optional().nullable(),
  claim_requirements: z.unknown().optional().nullable(),
  request_requirements: z.unknown().optional().nullable(),
  psi_parameters: z.unknown().optional().nullable(),
});

const categoryUpdateSchema = categoryCreateSchema.partial();

const parentDefaultsSchema = z.object({
  claimable_default: yesNoEnum,
  request_allowed_default: yesNoEnum,
  admin_curated_default: adminCuratedEnum,
  status: statusEnum.optional(),
});

function parseId(req: Request): CategoryId {
  const { id } = idParamSchema.parse(req.params);
  return BigInt(id);
}

export class CategoryController {
  async create(req: Request, res: Response) {
    const body = categoryCreateSchema.parse(req.body);
    if (body.is_parent === false && (!body.parent_id || body.parent_id.trim() === "")) {
      res.status(400).json({ message: "Child category must have a parent_id." });
      return;
    }
    let parentId: CategoryId | undefined;
    if (body.parent_id != null) {
      try {
        parentId = BigInt(body.parent_id);
      } catch {
        parentId = undefined;
      }
    } else {
      parentId = undefined;
    }

    const payload = {
      ...body,
      parent_id: parentId,
    };

    try {
      const created = await categoryService.createCategory(payload);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        res.status(409).json({ message: "Category name must be unique." });
        return;
      }
      throw err;
    }
  }

  async update(req: Request, res: Response) {
    const id = parseId(req);
    const body = categoryUpdateSchema.parse(req.body);
    const { parent_id: parentIdStr, ...rest } = body;
    
    let parentId: CategoryId | null | undefined = undefined;
    if (parentIdStr === null) {
      parentId = null;
    } else if (typeof parentIdStr === "string") {
      try {
        parentId = BigInt(parentIdStr);
      } catch {
        parentId = undefined;
      }
    }

    const payload: CategoryUpdateDTO = {
      ...rest,
      ...(parentId !== undefined && { parent_id: parentId }),
    };

    try {
      const updated = await categoryService.updateCategory(id, payload);
      res.json(updated);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        res.status(409).json({ message: "Category name must be unique." });
        return;
      }
      throw err;
    }
  }

  async delete(req: Request, res: Response) {
    const id = parseId(req);
    try {
      await categoryService.deleteCategory(id);
      res.status(204).send();
    } catch (err) {
      const anyErr = err as any;
      if (anyErr?.code === "CATEGORY_HAS_CHILDREN") {
        res.status(400).json({ message: "Category has children and cannot be deleted." });
        return;
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        // Foreign key constraint failed – category in use by polls/configs/etc.
        res.status(400).json({ message: "Category is in use and cannot be deleted." });
        return;
      }
      throw err;
    }
  }

  async getTree(_req: Request, res: Response) {
    const tree = await categoryService.getCategoryTree();
    res.json(tree);
  }

  async getEffective(req: Request, res: Response) {
    const id = parseId(req);
    const effective = await categoryService.getEffectiveCategory(id);
    if (!effective) {
      res.status(404).json({ message: "Category not found" });
      return;
    }
    res.json(effective);
  }

  async previewImpact(req: Request, res: Response) {
    const id = parseId(req);
    const body = parentDefaultsSchema.parse(req.body);
    const result = await categoryService.previewImpact(id, body);
    res.json(result);
  }
}

export const categoryController = new CategoryController();
