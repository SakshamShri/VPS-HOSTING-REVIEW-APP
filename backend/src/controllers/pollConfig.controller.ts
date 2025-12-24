import type { Request, Response } from "express";
import { z } from "zod";

import { pollConfigService } from "../services/pollConfig.service";
import {
  pollConfigCreateSchema,
  pollConfigUpdateSchema,
  type PollConfigCreateInput,
  type PollConfigUpdateInput,
} from "../validators/pollConfig.validator";
import type { PollConfigId } from "../types/pollConfig.types";

const idParamSchema = z.object({ id: z.string() });

function parseId(req: Request): PollConfigId {
  const { id } = idParamSchema.parse(req.params);
  return BigInt(id);
}

export class PollConfigController {
  async create(req: Request, res: Response) {
    const body: PollConfigCreateInput = pollConfigCreateSchema.parse(req.body);

    try {
      const created = await pollConfigService.create({
        name: body.name,
        status: body.status ?? "DRAFT",
        category_id: BigInt(body.categoryId),
        ui_template: body.uiTemplate,
        theme: body.theme,
        rules: body.rules,
        permissions: body.permissions,
      });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof Error && err.message === "CATEGORY_NOT_CHILD") {
        res.status(400).json({ message: "category_id must be a child category" });
        return;
      }
      if (err instanceof Error && err.message === "CATEGORY_NOT_FOUND") {
        res.status(400).json({ message: "category_id does not reference a valid category" });
        return;
      }
      if (err instanceof Error && err.message.includes("options")) {
        res.status(400).json({ message: err.message });
        return;
      }
      throw err;
    }
  }

  async update(req: Request, res: Response) {
    const id = parseId(req);
    const body: PollConfigUpdateInput = pollConfigUpdateSchema.parse(req.body);

    try {
      const updated = await pollConfigService.update(id, {
        name: body.name,
        status: body.status,
        category_id: body.categoryId ? BigInt(body.categoryId) : undefined,
        ui_template: body.uiTemplate,
        theme: body.theme,
        rules: body.rules as any,
        permissions: body.permissions,
      });
      res.json(updated);
    } catch (err) {
      if (err instanceof Error && err.message === "NOT_FOUND") {
        res.status(404).json({ message: "Poll config not found" });
        return;
      }
      if (err instanceof Error && err.message === "CATEGORY_NOT_CHILD") {
        res.status(400).json({ message: "category_id must be a child category" });
        return;
      }
      if (err instanceof Error && err.message === "CATEGORY_NOT_FOUND") {
        res.status(400).json({ message: "category_id does not reference a valid category" });
        return;
      }
      if (err instanceof Error && err.message.includes("options")) {
        res.status(400).json({ message: err.message });
        return;
      }
      throw err;
    }
  }

  async list(_req: Request, res: Response) {
    const configs = await pollConfigService.list();
    res.json(configs);
  }

  async getById(req: Request, res: Response) {
    const id = parseId(req);
    const cfg = await pollConfigService.getById(id);
    if (!cfg) {
      res.status(404).json({ message: "Poll config not found" });
      return;
    }
    res.json(cfg);
  }

  async clone(req: Request, res: Response) {
    const id = parseId(req);
    try {
      const cloned = await pollConfigService.clone(id);
      res.status(201).json(cloned);
    } catch (err) {
      if (err instanceof Error && err.message === "NOT_FOUND") {
        res.status(404).json({ message: "Poll config not found" });
        return;
      }
      throw err;
    }
  }

  async publish(req: Request, res: Response) {
    const id = parseId(req);
    try {
      const published = await pollConfigService.publish(id);
      res.json(published);
    } catch (err) {
      if (err instanceof Error && err.message === "NOT_FOUND") {
        res.status(404).json({ message: "Poll config not found" });
        return;
      }
      throw err;
    }
  }
}

export const pollConfigController = new PollConfigController();
