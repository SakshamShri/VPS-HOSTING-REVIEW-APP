"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollConfigRepository = exports.PollConfigRepository = void 0;
const db_1 = require("../utils/db");
class PollConfigRepository {
    async create(data) {
        return db_1.prisma.pollConfig.create({ data: data });
    }
    async update(id, data) {
        return db_1.prisma.pollConfig.update({ where: { id }, data: data });
    }
    async findById(id) {
        return db_1.prisma.pollConfig.findUnique({ where: { id } });
    }
    async findBySlug(slug) {
        return db_1.prisma.pollConfig.findUnique({ where: { slug } });
    }
    async list() {
        return db_1.prisma.pollConfig.findMany({ orderBy: { created_at: "desc" } });
    }
}
exports.PollConfigRepository = PollConfigRepository;
exports.pollConfigRepository = new PollConfigRepository();
