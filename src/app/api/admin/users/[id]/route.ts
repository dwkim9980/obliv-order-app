import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const { name, departmentId, newPassword } = await req.json();
  const data: any = {};
  if (name) data.name = name;
  if (departmentId !== undefined) data.departmentId = departmentId;
  if (newPassword) data.passwordHash = await bcrypt.hash(newPassword, 10);

  try {
    const user = await prisma.user.update({ where: { id }, data });
    const { passwordHash: _ph, ...safe } = user;
    return NextResponse.json(safe);
  } catch {
    return NextResponse.json({ error: "수정에 실패했습니다." }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  if (id === guard.user.id) {
    return NextResponse.json({ error: "자기 자신은 삭제할 수 없습니다." }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "해당 사용자의 발주내역이 있어 삭제할 수 없습니다." },
      { status: 400 }
    );
  }
}
