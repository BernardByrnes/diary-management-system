import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(notifications);
}

/** Remove notifications for the current user. `scope=read` deletes only read items; `scope=all` deletes everything. */
export async function DELETE(request: Request) {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");

  if (scope === "all") {
    await prisma.notification.deleteMany({ where: { userId: user.id } });
  } else if (scope === "read") {
    await prisma.notification.deleteMany({
      where: { userId: user.id, isRead: true },
    });
  } else {
    return NextResponse.json(
      { error: "Invalid or missing scope (use read or all)" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
