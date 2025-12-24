import type { PollConfig } from "@prisma/client";

import { prisma } from "../utils/db";
import type { PollConfigCreateDTO, PollConfigId, PollConfigUpdateDTO } from "../types/pollConfig.types";

export class PollConfigRepository {
  async create(data: PollConfigCreateDTO): Promise<PollConfig> {
    return prisma.pollConfig.create({ data: data as any });
  }

  async update(id: PollConfigId, data: PollConfigUpdateDTO): Promise<PollConfig> {
    return prisma.pollConfig.update({ where: { id }, data: data as any });
  }

  async findById(id: PollConfigId): Promise<PollConfig | null> {
    return prisma.pollConfig.findUnique({ where: { id } });
  }

  async findBySlug(slug: string): Promise<PollConfig | null> {
    return prisma.pollConfig.findUnique({ where: { slug } });
  }

  async list(): Promise<PollConfig[]> {
    return prisma.pollConfig.findMany({ orderBy: { created_at: "desc" } });
  }
}

export const pollConfigRepository = new PollConfigRepository();
