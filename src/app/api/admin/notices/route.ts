import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const notices = await prisma.notice.findMany({ orderBy: { createdAt: "desc" } });

  const branchIds = [...new Set(notices.filter((n) => n.branchId).map((n) => n.branchId as string))];
  const centerIds = [...new Set(notices.filter((n) => n.centerId).map((n) => n.centerId as string))];

  const [branches, centers] = await Promise.all([
    prisma.branch.findMany({ where: { id: { in: branchIds } } }),
    prisma.center.findMany({ where: { id: { in: centerIds } } }),
  ]);
  const branchMap = new Map(branches.map((b) => [b.id, b.name]));
  const centerMap = new Map(centers.map((c) => [c.id, c.name]));

  const result = notices.map((n) => ({
    ...n,
    branchName: n.branchId ? branchMap.get(n.branchId) ?? null : null,
    centerName: n.centerId ? centerMap.get(n.centerId) ?? null : null,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { title, content, scope, branchId, centerId } = await req.json();
  if (!title || !content) {
    return NextResponse.json({ error: "제목과 내용을 입력하세요." }, { status: 400 });
  }
  if (!["ALL", "BRANCH", "CENTER"].includes(scope)) {
    return NextResponse.json({ error: "잘못된 범위입니다." }, { status: 400 });
  }
  if (scope === "BRANCH" && !branchId) {
    return NextResponse.json({ error: "지점을 선택하세요." }, { status: 400 });
  }
  if (scope === "CENTER" && !centerId) {
    return NextResponse.json({ error: "센터를 선택하세요." }, { status: 400 });
  }

  const notice = await prisma.notice.create({
    data: {
      title,
      content,
      scope,
      branchId: scope === "BRANCH" ? branchId : null,
      centerId: scope === "CENTER" ? centerId : null,
    },
  });

  return NextResponse.json(notice, { status: 201 });
}
