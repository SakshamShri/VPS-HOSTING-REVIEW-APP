import type { Request, Response } from "express";

import { pollService } from "../services/poll.service";

class FeedController {
  async listUserFeed(_req: Request, res: Response) {
    const items = await pollService.listForUserFeed();

    const payload = items.map((p) => ({
      id: p.id.toString(),
      title: p.title,
      description: p.description,
      status: p.status,
      categoryName: p.category_name,
      startAt: p.start_at,
      endAt: p.end_at,
    }));

    res.json({ polls: payload });
  }
}

export const feedController = new FeedController();
