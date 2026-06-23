import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId");

  const centers = await prisma.center.findMany({
    where: branchId ? { branchId } : undefined,
    include: {
      branch: true,
      departments: { include: { _count: { select: { orders: true, users: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(centers);
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { name, branchId } = await req.json();
  if (!name || !branchId) {
    return NextResponse.json({ error: "센터명과 지점을 지정하세요." }, { status: 400 });
  }

  try {
    const center = await prisma.center.create({ data: { name, branchId } });
    return NextResponse.json(center, { status: 201 });
  } catch {
    return NextResponse.json({ error: "이미 존재하는 센터명입니다." }, { status: 400 });
  }
}
