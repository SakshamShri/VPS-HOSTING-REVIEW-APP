"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserPollHandler = createUserPollHandler;
exports.createUserPollOwnerInviteHandler = createUserPollOwnerInviteHandler;
exports.createUserPollInvitesHandler = createUserPollInvitesHandler;
exports.listUserGroupsHandler = listUserGroupsHandler;
exports.createUserGroupHandler = createUserGroupHandler;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const userPoll_service_1 = require("../services/userPoll.service");
const createPollSchema = zod_1.z.object({
    category_id: zod_1.z.string().min(1),
    type: zod_1.z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "RATING", "YES_NO"]),
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional().nullable(),
    options: zod_1.z.array(zod_1.z.string().min(1)).min(2),
    start_mode: zod_1.z.enum(["INSTANT", "SCHEDULED"]),
    start_at: zod_1.z.string().datetime().optional().nullable(),
    end_at: zod_1.z.string().datetime().optional().nullable(),
    source_info: zod_1.z.string().optional().nullable(),
});
const createInvitesSchema = zod_1.z.object({
    mobiles: zod_1.z.array(zod_1.z.string().min(1)).optional().default([]),
    existing_group_ids: zod_1.z.array(zod_1.z.string().min(1)).optional().default([]),
    new_group: zod_1.z
        .object({
        name: zod_1.z.string().min(1),
        mobiles: zod_1.z.array(zod_1.z.string().min(1)).min(1),
    })
        .optional()
        .nullable(),
});
const createGroupSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    mobiles: zod_1.z.array(zod_1.z.string().min(1)).min(1),
});
async function createUserPollHandler(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const parsed = createPollSchema.parse(req.body);
        let categoryId;
        try {
            categoryId = BigInt(parsed.category_id);
        }
        catch {
            return res.status(400).json({ message: "Invalid category_id" });
        }
        const now = new Date();
        const startAt = parsed.start_mode === "SCHEDULED" && parsed.start_at ? new Date(parsed.start_at) : null;
        const endAt = parsed.end_at ? new Date(parsed.end_at) : null;
        if (parsed.start_mode === "SCHEDULED" && !startAt) {
            return res.status(400).json({ message: "start_at is required for scheduled polls" });
        }
        if (parsed.start_mode === "SCHEDULED" && startAt && startAt <= now) {
            return res.status(400).json({ message: "start_at must be in the future" });
        }
        if (endAt && startAt && endAt <= startAt) {
            return res.status(400).json({ message: "end_at must be after start_at" });
        }
        if (parsed.start_mode === "INSTANT" && endAt && endAt <= now) {
            return res.status(400).json({ message: "end_at must be after current time" });
        }
        const poll = await userPoll_service_1.userPollService.createPollForUser(req.user.id, {
            categoryId,
            type: parsed.type,
            title: parsed.title,
            description: parsed.description ?? null,
            options: parsed.options,
            startMode: parsed.start_mode,
            startAt,
            endAt,
            sourceInfo: parsed.source_info ?? null,
        });
        return res.status(201).json({
            id: poll.id.toString(),
            status: poll.status,
            start_at: poll.start_at,
            end_at: poll.end_at,
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: "Invalid payload", issues: err.errors });
        }
        // Helpful dev-time error when Prisma client/db schema is out of sync.
        if (err instanceof client_1.Prisma.PrismaClientValidationError) {
            const msg = String(err?.message ?? "");
            if (msg.includes("Unknown argument") || msg.includes("category_id")) {
                return res.status(500).json({
                    message: "Server schema is out of sync. Run `npx prisma migrate dev` (or `npx prisma generate`) and restart the backend.",
                });
            }
        }
        if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            const msg = String(err?.message ?? "");
            // Common when DB table/column doesn't exist yet (e.g., after adding category_id)
            if (err.code === "P2021" || err.code === "P2022" || msg.toLowerCase().includes("category_id")) {
                return res.status(500).json({
                    message: "Database is out of sync with Prisma schema. Run `npx prisma migrate dev` and restart the backend.",
                });
            }
        }
        const code = err?.code;
        if (code === "CATEGORY_NOT_FOUND" ||
            code === "CATEGORY_NOT_CHILD" ||
            code === "CATEGORY_NOT_ACTIVE" ||
            code === "CATEGORY_NOT_ALLOWED") {
            return res.status(403).json({ message: "Category is not allowed for user polls" });
        }
        // eslint-disable-next-line no-console
        console.error(err);
        return res.status(500).json({ message: "Failed to create poll" });
    }
}
async function createUserPollOwnerInviteHandler(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const pollIdParam = req.params.id;
        if (!pollIdParam) {
            return res.status(400).json({ message: "Poll id is required" });
        }
        const pollId = BigInt(pollIdParam);
        const result = await userPoll_service_1.userPollService.createOwnerInviteForUser(req.user.id, pollId);
        return res.status(200).json(result);
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: "Invalid payload", issues: err.errors });
        }
        const code = err?.code;
        if (code === "POLL_NOT_FOUND") {
            return res.status(404).json({ message: "Poll not found" });
        }
        if (code === "POLL_NOT_LIVE") {
            return res.status(400).json({ message: "Poll is not live" });
        }
        if (code === "POLL_NOT_INVITE_ONLY") {
            return res.status(400).json({ message: "Poll is not invite-only" });
        }
        // eslint-disable-next-line no-console
        console.error(err);
        return res.status(500).json({ message: "Failed to create owner invite" });
    }
}
async function createUserPollInvitesHandler(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const pollIdParam = req.params.id;
        if (!pollIdParam) {
            return res.status(400).json({ message: "Poll id is required" });
        }
        const pollId = BigInt(pollIdParam);
        const parsed = createInvitesSchema.parse(req.body);
        const existingGroupIds = parsed.existing_group_ids.map((id) => BigInt(id));
        const invites = await userPoll_service_1.userPollService.createInvitesForPoll(req.user.id, pollId, {
            mobiles: parsed.mobiles,
            existingGroupIds,
            newGroup: parsed.new_group ?? null,
        });
        return res.status(201).json({ invites });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: "Invalid payload", issues: err.errors });
        }
        if (err?.code === "NOT_FOUND_OR_FORBIDDEN") {
            return res.status(404).json({ message: "Poll not found" });
        }
        // eslint-disable-next-line no-console
        console.error(err);
        return res.status(500).json({ message: "Failed to create invites" });
    }
}
async function listUserGroupsHandler(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const groups = await userPoll_service_1.userPollService.listGroupsForUser(req.user.id);
        return res.status(200).json({ groups });
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        return res.status(500).json({ message: "Failed to fetch groups" });
    }
}
async function createUserGroupHandler(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const parsed = createGroupSchema.parse(req.body);
        const group = await userPoll_service_1.userPollService.createGroupForUser(req.user.id, parsed.name, parsed.mobiles);
        return res.status(201).json({ group });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: "Invalid payload", issues: err.errors });
        }
        // eslint-disable-next-line no-console
        console.error(err);
        return res.status(500).json({ message: "Failed to create group" });
    }
}
