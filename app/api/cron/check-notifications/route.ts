import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { checkAndCreateNotifications } from "@/lib/utils/notifications";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ed = await prisma.user.findFirst({
    where: { role: "EXECUTIVE_DIRECTOR", isActive: true },
    select: { id: true },
  });

  if (!ed) {
    return NextResponse.json({ error: "No active ED found" }, { status: 404 });
  }

  await checkAndCreateNotifications(ed.id);

  return NextResponse.json({ ok: true, ranAt: new Date().toISOString() });
}
