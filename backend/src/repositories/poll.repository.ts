import type { Poll } from "@prisma/client";

import { prisma } from "../utils/db";
import type { PollCreateDTO, PollId, PollUpdateDTO } from "../types/poll.types";

export class PollRepository {
  async create(data: PollCreateDTO): Promise<Poll> {
    return prisma.poll.create({ data });
  }

  async update(id: PollId, data: PollUpdateDTO): Promise<Poll> {
    return prisma.poll.update({ where: { id }, data });
  }

  async findById(id: PollId): Promise<Poll | null> {
    return prisma.poll.findUnique({ where: { id } });
  }

  async findByIdWithRelations(id: PollId) {
    return prisma.poll.findUnique({
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
    return prisma.poll.findMany({
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

export const pollRepository = new PollRepository();
