"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryController = exports.CategoryController = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const category_service_1 = require("../services/category.service");
const idParamSchema = zod_1.z.object({ id: zod_1.z.string() });
const yesNoEnum = zod_1.z.enum(["YES", "NO"]);
const adminCuratedEnum = zod_1.z.enum(["YES", "NO", "PARTIAL"]);
const statusEnum = zod_1.z.enum(["ACTIVE", "DISABLED"]);
const categoryCreateSchema = zod_1.z.object({
    name_en: zod_1.z.string().min(1),
    name_local: zod_1.z.string().optional().nullable(),
    description: zod_1.z.string().optional().nullable(),
    is_parent: zod_1.z.boolean(),
    parent_id: zod_1.z.string().optional().nullable(),
    claimable_default: yesNoEnum,
    request_allowed_default: yesNoEnum,
    admin_curated_default: adminCuratedEnum,
    claimable: yesNoEnum.optional().nullable(),
    request_allowed: yesNoEnum.optional().nullable(),
    admin_curated: adminCuratedEnum.optional().nullable(),
    status: statusEnum,
    display_order: zod_1.z.number().int().optional(),
    notes: zod_1.z.string().optional().nullable(),
});
const categoryUpdateSchema = categoryCreateSchema.partial();
const parentDefaultsSchema = zod_1.z.object({
    claimable_default: yesNoEnum,
    request_allowed_default: yesNoEnum,
    admin_curated_default: adminCuratedEnum,
    status: statusEnum.optional(),
});
function parseId(req) {
    const { id } = idParamSchema.parse(req.params);
    return BigInt(id);
}
class CategoryController {
    async create(req, res) {
        const body = categoryCreateSchema.parse(req.body);
        let parentId = null;
        if (body.parent_id != null) {
            try {
                parentId = BigInt(body.parent_id);
            }
            catch {
                parentId = null;
            }
        }
        const payload = {
            ...body,
            parent_id: parentId,
        };
        try {
            const created = await category_service_1.categoryService.createCategory(payload);
            res.status(201).json(created);
        }
        catch (err) {
            if (err instanceof client_1.Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
                res.status(409).json({ message: "Category name must be unique." });
                return;
            }
            throw err;
        }
    }
    async update(req, res) {
        const id = parseId(req);
        const body = categoryUpdateSchema.parse(req.body);
        let parentId = undefined;
        if (body.parent_id === null) {
            parentId = null;
        }
        else if (typeof body.parent_id === "string") {
            try {
                parentId = BigInt(body.parent_id);
            }
            catch {
                parentId = undefined;
            }
        }
        const payload = {
            ...body,
            parent_id: parentId,
        };
        try {
            const updated = await category_service_1.categoryService.updateCategory(id, payload);
            res.json(updated);
        }
        catch (err) {
            if (err instanceof client_1.Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
                res.status(409).json({ message: "Category name must be unique." });
                return;
            }
            throw err;
        }
    }
    async getTree(_req, res) {
        const tree = await category_service_1.categoryService.getCategoryTree();
        res.json(tree);
    }
    async getEffective(req, res) {
        const id = parseId(req);
        const effective = await category_service_1.categoryService.getEffectiveCategory(id);
        if (!effective) {
            res.status(404).json({ message: "Category not found" });
            return;
        }
        res.json(effective);
    }
    async previewImpact(req, res) {
        const id = parseId(req);
        const body = parentDefaultsSchema.parse(req.body);
        const result = await category_service_1.categoryService.previewImpact(id, body);
        res.json(result);
    }
}
exports.CategoryController = CategoryController;
exports.categoryController = new CategoryController();
