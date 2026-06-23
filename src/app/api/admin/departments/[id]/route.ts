import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const { name, centerId, snackEnabled } = await req.json();
  const data: any = {};
  if (name) data.name = name;
  if (centerId) data.centerId = centerId;
  if (snackEnabled !== undefined) data.snackEnabled = Boolean(snackEnabled);

  try {
    const department = await prisma.department.update({ where: { id }, data });
    return NextResponse.json(department);
  } catch {
    return NextResponse.json({ error: "수정에 실패했습니다." }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  try {
    await prisma.department.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "소속된 계정 또는 발주내역이 있어 삭제할 수 없습니다." },
      { status: 400 }
    );
  }
}
