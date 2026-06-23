import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { ids, status } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "선택된 항목이 없습니다." }, { status: 400 });
  }
  if (!["PENDING", "ORDERED"].includes(status)) {
    return NextResponse.json({ error: "잘못된 상태입니다." }, { status: 400 });
  }

  const result = await prisma.cardRequest.updateMany({
    where: { id: { in: ids } },
    data: { status },
  });

  return NextResponse.json({ ok: true, count: result.count });
}
