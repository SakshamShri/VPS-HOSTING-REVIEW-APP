"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollConfigController = exports.PollConfigController = void 0;
const zod_1 = require("zod");
const pollConfig_service_1 = require("../services/pollConfig.service");
const pollConfig_validator_1 = require("../validators/pollConfig.validator");
const idParamSchema = zod_1.z.object({ id: zod_1.z.string() });
function parseId(req) {
    const { id } = idParamSchema.parse(req.params);
    return BigInt(id);
}
class PollConfigController {
    async create(req, res) {
        const body = pollConfig_validator_1.pollConfigCreateSchema.parse(req.body);
        try {
            const created = await pollConfig_service_1.pollConfigService.create({
                name: body.name,
                status: body.status ?? "DRAFT",
                category_id: BigInt(body.categoryId),
                ui_template: body.uiTemplate,
                theme: body.theme,
                rules: body.rules,
                permissions: body.permissions,
            });
            res.status(201).json(created);
        }
        catch (err) {
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
    async update(req, res) {
        const id = parseId(req);
        const body = pollConfig_validator_1.pollConfigUpdateSchema.parse(req.body);
        try {
            const updated = await pollConfig_service_1.pollConfigService.update(id, {
                name: body.name,
                status: body.status,
                category_id: body.categoryId ? BigInt(body.categoryId) : undefined,
                ui_template: body.uiTemplate,
                theme: body.theme,
                rules: body.rules,
                permissions: body.permissions,
            });
            res.json(updated);
        }
        catch (err) {
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
    async list(_req, res) {
        const configs = await pollConfig_service_1.pollConfigService.list();
        res.json(configs);
    }
    async getById(req, res) {
        const id = parseId(req);
        const cfg = await pollConfig_service_1.pollConfigService.getById(id);
        if (!cfg) {
            res.status(404).json({ message: "Poll config not found" });
            return;
        }
        res.json(cfg);
    }
    async clone(req, res) {
        const id = parseId(req);
        try {
            const cloned = await pollConfig_service_1.pollConfigService.clone(id);
            res.status(201).json(cloned);
        }
        catch (err) {
            if (err instanceof Error && err.message === "NOT_FOUND") {
                res.status(404).json({ message: "Poll config not found" });
                return;
            }
            throw err;
        }
    }
    async publish(req, res) {
        const id = parseId(req);
        try {
            const published = await pollConfig_service_1.pollConfigService.publish(id);
            res.json(published);
        }
        catch (err) {
            if (err instanceof Error && err.message === "NOT_FOUND") {
                res.status(404).json({ message: "Poll config not found" });
                return;
            }
            throw err;
        }
    }
}
exports.PollConfigController = PollConfigController;
exports.pollConfigController = new PollConfigController();
