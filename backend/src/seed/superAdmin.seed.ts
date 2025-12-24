import { prisma } from "../utils/db";
import { hashPassword } from "../utils/password";

const SUPER_ADMIN_USERNAME = "Admin";
const SUPER_ADMIN_PASSWORD = "1234";

export async function seedSuperAdmin() {
  const existing = await prisma.adminCredentials.findUnique({
    where: { username: SUPER_ADMIN_USERNAME },
  });

  if (existing) {
    return;
  }

  const password_hash = await hashPassword(SUPER_ADMIN_PASSWORD);

  await prisma.adminCredentials.create({
    data: {
      username: SUPER_ADMIN_USERNAME,
      password_hash,
      role: "SUPER_ADMIN",
      is_active: true,
    },
  });
}
