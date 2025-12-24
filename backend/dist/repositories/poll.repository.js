"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollRepository = exports.PollRepository = void 0;
const db_1 = require("../utils/db");
class PollRepository {
    async create(data) {
        return db_1.prisma.poll.create({ data });
    }
    async update(id, data) {
        return db_1.prisma.poll.update({ where: { id }, data });
    }
    async findById(id) {
        return db_1.prisma.poll.findUnique({ where: { id } });
    }
    async findByIdWithRelations(id) {
        return db_1.prisma.poll.findUnique({
            where: { id },
            include: {
                category: {
                    include: { parent: true },
                },
                pollConfig: true,
            },
        });
    }
    async listWithRelations() {
        return db_1.prisma.poll.findMany({
            include: {
                category: {
                    include: { parent: true },
                },
                pollConfig: true,
            },
            orderBy: { created_at: "desc" },
        });
    }
}
exports.PollRepository = PollRepository;
exports.pollRepository = new PollRepository();
