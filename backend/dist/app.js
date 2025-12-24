"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const category_routes_1 = require("./routes/category.routes");
const pollConfig_routes_1 = require("./routes/pollConfig.routes");
const poll_routes_1 = require("./routes/poll.routes");
const health_routes_1 = require("./routes/health.routes");
const auth_routes_1 = require("./routes/auth.routes");
const user_routes_1 = require("./routes/user.routes");
const invite_routes_1 = require("./routes/invite.routes");
const profileSystem_routes_1 = require("./routes/profileSystem.routes");
function createApp() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({
        origin: "http://localhost:5173",
        methods: ["GET", "POST", "PUT", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    }));
    app.use(express_1.default.json());
    app.use(health_routes_1.healthRouter);
    app.use(category_routes_1.categoryRouter);
    app.use(pollConfig_routes_1.pollConfigRouter);
    app.use(poll_routes_1.pollRouter);
    app.use(auth_routes_1.authRouter);
    app.use(user_routes_1.userRouter);
    app.use(invite_routes_1.inviteRouter);
    app.use(profileSystem_routes_1.profileSystemRouter);
    app.use((err, _req, res, _next) => {
        // Minimal error handler for now
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    });
    return app;
}
