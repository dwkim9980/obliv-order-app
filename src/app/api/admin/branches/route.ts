import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const branches = await prisma.branch.findMany({
    include: {
      centers: {
        include: {
          departments: { include: { _count: { select: { orders: true, users: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(branches);
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "지점명을 입력하세요." }, { status: 400 });

  try {
    const branch = await prisma.branch.create({ data: { name } });
    return NextResponse.json(branch, { status: 201 });
  } catch {
    return NextResponse.json({ error: "이미 존재하는 지점명입니다." }, { status: 400 });
  }
}
