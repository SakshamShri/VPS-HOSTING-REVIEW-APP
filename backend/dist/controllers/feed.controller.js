"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedController = void 0;
const poll_service_1 = require("../services/poll.service");
class FeedController {
    async listUserFeed(_req, res) {
        const items = await poll_service_1.pollService.listForUserFeed();
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
exports.feedController = new FeedController();
