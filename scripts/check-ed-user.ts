import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to database...");

  const user = await prisma.user.findUnique({
    where: { phone: "0700000001" },
  });

  if (!user) {
    console.log("❌ ED user NOT FOUND in database (phone: 0700000001)");
    console.log("\nCreating ED user now...");

    const hash = await bcrypt.hash("Admin@1234", 10);
    const newUser = await prisma.user.create({
      data: {
        fullName: "Executive Director",
        phone: "0700000001",
        password: hash,
        role: "EXECUTIVE_DIRECTOR",
        isActive: true,
        mustChangePassword: false,
      },
    });
    console.log("✅ ED user created:", newUser.id);
  } else {
    console.log("✅ ED user found:");
    console.log("  ID:", user.id);
    console.log("  Name:", user.fullName);
    console.log("  Phone:", user.phone);
    console.log("  Role:", user.role);
    console.log("  isActive:", user.isActive);
    console.log("  mustChangePassword:", user.mustChangePassword);
    console.log("  Password hash prefix:", user.password.substring(0, 20) + "...");

    // Verify password
    const passwordOk = await bcrypt.compare("Admin@1234", user.password);
    console.log("\n  Password 'Admin@1234' matches hash?", passwordOk ? "✅ YES" : "❌ NO");

    if (!passwordOk) {
      console.log("\n  🔧 Fixing password hash...");
      const newHash = await bcrypt.hash("Admin@1234", 10);
      await prisma.user.update({
        where: { phone: "0700000001" },
        data: { password: newHash },
      });
      console.log("  ✅ Password updated successfully!");
    }

    if (!user.isActive) {
      console.log("\n  🔧 Account is deactivated — re-activating...");
      await prisma.user.update({
        where: { phone: "0700000001" },
        data: { isActive: true },
      });
      console.log("  ✅ Account re-activated!");
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
