"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateInviteHandler = validateInviteHandler;
exports.acceptInviteHandler = acceptInviteHandler;
exports.rejectInviteHandler = rejectInviteHandler;
const zod_1 = require("zod");
const invite_service_1 = require("../services/invite.service");
const tokenBodySchema = zod_1.z.object({
    token: zod_1.z.string().min(1),
});
async function validateInviteHandler(req, res) {
    try {
        const token = req.query.token ?? "";
        if (!token) {
            return res.status(400).json({ message: "token is required" });
        }
        const summary = await invite_service_1.inviteService.validateUserPollInvite(token);
        return res.status(200).json({ poll: summary });
    }
    catch (err) {
        const code = err?.code;
        if (code === "INVITE_NOT_FOUND") {
            return res.status(404).json({ message: "Invite not found" });
        }
        if (code === "INVITE_ALREADY_USED") {
            return res.status(400).json({ message: "Invite has already been used" });
        }
        if (code === "POLL_NOT_ACTIVE") {
            return res.status(400).json({ message: "Poll is not active" });
        }
        // eslint-disable-next-line no-console
        console.error(err);
        return res.status(500).json({ message: "Failed to validate invite" });
    }
}
async function acceptInviteHandler(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const parsed = tokenBodySchema.parse(req.body);
        const result = await invite_service_1.inviteService.acceptUserPollInvite(parsed.token, req.user.id);
        return res.status(200).json(result);
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: "Invalid payload", issues: err.errors });
        }
        const code = err?.code;
        if (code === "INVITE_NOT_FOUND") {
            return res.status(404).json({ message: "Invite not found" });
        }
        if (code === "INVITE_ALREADY_USED") {
            return res.status(400).json({ message: "Invite has already been used" });
        }
        if (code === "POLL_NOT_ACTIVE") {
            return res.status(400).json({ message: "Poll is not active" });
        }
        // eslint-disable-next-line no-console
        console.error(err);
        return res.status(500).json({ message: "Failed to accept invite" });
    }
}
async function rejectInviteHandler(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const parsed = tokenBodySchema.parse(req.body);
        const result = await invite_service_1.inviteService.rejectUserPollInvite(parsed.token);
        return res.status(200).json(result);
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: "Invalid payload", issues: err.errors });
        }
        const code = err?.code;
        if (code === "INVITE_NOT_FOUND") {
            return res.status(404).json({ message: "Invite not found" });
        }
        if (code === "INVITE_ALREADY_USED") {
            return res.status(400).json({ message: "Invite has already been used" });
        }
        if (code === "POLL_NOT_ACTIVE") {
            return res.status(400).json({ message: "Poll is not active" });
        }
        // eslint-disable-next-line no-console
        console.error(err);
        return res.status(500).json({ message: "Failed to reject invite" });
    }
}
