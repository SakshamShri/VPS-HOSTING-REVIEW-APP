import type { Response } from "express";

import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { categoryService } from "../services/category.service";
import type { CategoryTreeNodeDTO } from "../types/category.types";

interface UserCategoryNodeDTO {
  id: string;
  name: string;
  type: "parent" | "child";
  status: "active" | "disabled";
  children: UserCategoryNodeDTO[];
}

async function mapNodeToUserCategory(
  node: CategoryTreeNodeDTO
): Promise<UserCategoryNodeDTO | null> {
  if (node.is_parent) {
    const childResults = await Promise.all(node.children.map(mapNodeToUserCategory));
    const children = childResults.filter(Boolean) as UserCategoryNodeDTO[];
    if (!children.length) {
      return null;
    }
    return {
      id: node.id.toString(),
      name: node.name_en,
      type: "parent",
      status: node.status === "ACTIVE" ? "active" : "disabled",
      children,
    };
  }

  // Child category: enforce ACTIVE + effectiveClaimable=YES + effectiveRequestAllowed=YES
  if (node.status !== "ACTIVE") {
    return null;
  }

  const effective = await categoryService.getEffectiveCategory(node.id);
  if (!effective) {
    return null;
  }

  if (effective.effectiveStatus !== "ACTIVE") {
    return null;
  }

  if (effective.effectiveClaimable !== "YES" || effective.effectiveRequestAllowed !== "YES") {
    return null;
  }

  return {
    id: node.id.toString(),
    name: node.name_en,
    type: "child",
    status: "active",
    children: [],
  };
}

export async function listUserClaimableCategoriesHandler(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const tree = await categoryService.getCategoryTree();
    const rootResults = await Promise.all(tree.map(mapNodeToUserCategory));
    const categories = rootResults.filter(Boolean) as UserCategoryNodeDTO[];

    return res.status(200).json({ categories });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Failed to load categories" });
  }
}
