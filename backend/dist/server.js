"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = require("./app");
const superAdmin_seed_1 = require("./seed/superAdmin.seed");
// Ensure BigInt values from Prisma can be safely serialized in JSON responses
BigInt.prototype.toJSON = function toJSON() {
    return this.toString();
};
const port = process.env.PORT ? Number(process.env.PORT) : 4000;
const app = (0, app_1.createApp)();
app.listen(port, async () => {
    await (0, superAdmin_seed_1.seedSuperAdmin)();
    // eslint-disable-next-line no-console
    console.log(`Category Master backend listening on port ${port}`);
});
