"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUserClaimableCategoriesHandler = listUserClaimableCategoriesHandler;
const category_service_1 = require("../services/category.service");
async function mapNodeToUserCategory(node) {
    if (node.is_parent) {
        const childResults = await Promise.all(node.children.map(mapNodeToUserCategory));
        const children = childResults.filter(Boolean);
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
    const effective = await category_service_1.categoryService.getEffectiveCategory(node.id);
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
async function listUserClaimableCategoriesHandler(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const tree = await category_service_1.categoryService.getCategoryTree();
        const rootResults = await Promise.all(tree.map(mapNodeToUserCategory));
        const categories = rootResults.filter(Boolean);
        return res.status(200).json({ categories });
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        return res.status(500).json({ message: "Failed to load categories" });
    }
}
