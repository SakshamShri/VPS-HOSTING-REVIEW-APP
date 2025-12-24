"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryRepository = exports.CategoryRepository = void 0;
const db_1 = require("../utils/db");
class CategoryRepository {
    async create(data) {
        return db_1.prisma.category.create({ data });
    }
    async update(id, data) {
        return db_1.prisma.category.update({ where: { id }, data });
    }
    async findById(id) {
        return db_1.prisma.category.findUnique({ where: { id } });
    }
    async findByIdWithParent(id) {
        return db_1.prisma.category.findUnique({ where: { id }, include: { parent: true } });
    }
    async findChildren(parentId, domain) {
        return db_1.prisma.category.findMany({
            where: {
                parent_id: parentId,
                ...(domain ? { domain } : {}),
            },
        });
    }
    async findTree(domain) {
        const categories = await db_1.prisma.category.findMany({
            where: {
                ...(domain ? { domain } : {}),
            },
            orderBy: { display_order: "asc" },
        });
        return categories;
    }
    async findActiveChildrenForImpact(parentId, domain) {
        return db_1.prisma.category.findMany({
            where: {
                parent_id: parentId,
                ...(domain ? { domain } : {}),
                status: { in: ["ACTIVE", "DISABLED"] },
            },
            orderBy: { display_order: "asc" },
        });
    }
}
exports.CategoryRepository = CategoryRepository;
exports.categoryRepository = new CategoryRepository();
