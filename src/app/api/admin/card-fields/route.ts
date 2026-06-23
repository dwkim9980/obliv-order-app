import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { formType, label } = await req.json();
  if (!formType || !label) {
    return NextResponse.json({ error: "항목명을 입력하세요." }, { status: 400 });
  }
  if (!["NAMETAG", "BUSINESSCARD", "UNIFORM"].includes(formType)) {
    return NextResponse.json({ error: "잘못된 신청서 종류입니다." }, { status: 400 });
  }

  const maxOrder = await prisma.cardRequestField.aggregate({
    where: { formType },
    _max: { order: true },
  });

  const field = await prisma.cardRequestField.create({
    data: { formType, label, order: (maxOrder._max.order ?? -1) + 1 },
  });
  return NextResponse.json(field, { status: 201 });
}
