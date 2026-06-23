import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "지점명을 입력하세요." }, { status: 400 });

  try {
    const branch = await prisma.branch.update({ where: { id }, data: { name } });
    return NextResponse.json(branch);
  } catch {
    return NextResponse.json({ error: "수정에 실패했습니다." }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  try {
    await prisma.branch.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "소속된 센터가 있어 삭제할 수 없습니다. 먼저 센터를 삭제하세요." },
      { status: 400 }
    );
  }
}
