import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const { name, branchId, address } = await req.json();
  const data: any = {};
  if (name) data.name = name;
  if (branchId) data.branchId = branchId;
  if (address !== undefined) data.address = address || null;

  try {
    const center = await prisma.center.update({ where: { id }, data });
    return NextResponse.json(center);
  } catch {
    return NextResponse.json({ error: "수정에 실패했습니다." }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  try {
    await prisma.center.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "소속된 부서가 있어 삭제할 수 없습니다. 먼저 부서를 삭제하세요." },
      { status: 400 }
    );
  }
}
