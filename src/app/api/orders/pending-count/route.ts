import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const count = await prisma.order.count({ where: { status: "PENDING" } });
  return NextResponse.json({ count });
}
