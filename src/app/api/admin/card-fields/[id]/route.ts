import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const { label } = await req.json();
  if (!label) return NextResponse.json({ error: "항목명을 입력하세요." }, { status: 400 });

  try {
    const field = await prisma.cardRequestField.update({ where: { id }, data: { label } });
    return NextResponse.json(field);
  } catch {
    return NextResponse.json({ error: "수정에 실패했습니다." }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  await prisma.cardRequestField.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
