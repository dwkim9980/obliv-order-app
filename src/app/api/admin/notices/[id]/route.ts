import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const { title, content, scope, branchId, centerId } = await req.json();
  const data: any = {};
  if (title !== undefined) data.title = title;
  if (content !== undefined) data.content = content;
  if (scope !== undefined) {
    if (!["ALL", "BRANCH", "CENTER"].includes(scope)) {
      return NextResponse.json({ error: "잘못된 범위입니다." }, { status: 400 });
    }
    data.scope = scope;
    data.branchId = scope === "BRANCH" ? branchId ?? null : null;
    data.centerId = scope === "CENTER" ? centerId ?? null : null;
  }

  try {
    const notice = await prisma.notice.update({ where: { id }, data });
    return NextResponse.json(notice);
  } catch {
    return NextResponse.json({ error: "수정에 실패했습니다." }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  await prisma.notice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
