import "dotenv/config";

import { createApp } from "./app";
import { seedSuperAdmin } from "./seed/superAdmin.seed";

// Ensure BigInt values from Prisma can be safely serialized in JSON responses
(BigInt.prototype as any).toJSON = function toJSON() {
  return this.toString();
};

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

const app = createApp();

app.listen(port, async () => {
  await seedSuperAdmin();
  // eslint-disable-next-line no-console
  console.log(`Category Master backend listening on port ${port}`);
});
