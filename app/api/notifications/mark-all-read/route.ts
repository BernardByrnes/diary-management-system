import { NextResponse } from "next/server";
import { getActiveUserOrError } from "@/lib/utils/session";
import { prisma } from "@/lib/db/prisma";

async function markAllAsRead() {
  const { user, error } = await getActiveUserOrError();
  if (error) return error;

  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true });
}

export async function PATCH() {
  return markAllAsRead();
}

export async function POST() {
  return markAllAsRead();
}
