import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

const ALLOWED_BULK_STATUSES = ["ORDERED", "CLOSED"];

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { ids, status } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "선택된 항목이 없습니다." }, { status: 400 });
  }
  if (!ALLOWED_BULK_STATUSES.includes(status)) {
    return NextResponse.json({ error: "일괄 처리는 주문/마감 상태만 가능합니다." }, { status: 400 });
  }

  const result = await prisma.order.updateMany({
    where: { id: { in: ids } },
    data: { status },
  });

  return NextResponse.json({ ok: true, count: result.count });
}
