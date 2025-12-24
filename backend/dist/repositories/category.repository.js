"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryRepository = exports.CategoryRepository = void 0;
const db_1 = require("../utils/db");
class CategoryRepository {
    async create(data) {
        const { parent_id, ...rest } = data;
        const createData = {
            ...rest,
        };
        if (parent_id !== undefined) {
            createData.parent = { connect: { id: parent_id } };
        }
        return db_1.prisma.category.create({ data: createData });
    }
    async update(id, data) {
        const { parent_id, ...rest } = data;
        const updateData = {
            ...rest,
        };
        if (parent_id !== undefined) {
            if (parent_id === null) {
                updateData.parent = { disconnect: true };
            }
            else {
                updateData.parent = { connect: { id: parent_id } };
            }
        }
        return db_1.prisma.category.update({ where: { id }, data: updateData });
    }
    async delete(id) {
        await db_1.prisma.category.delete({ where: { id } });
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
