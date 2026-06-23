import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const departments = await prisma.department.findMany({
    include: { center: true, _count: { select: { orders: true, users: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(departments);
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { name, centerId } = await req.json();
  if (!name || !centerId) {
    return NextResponse.json({ error: "부서명과 센터를 지정하세요." }, { status: 400 });
  }

  try {
    const department = await prisma.department.create({ data: { name, centerId } });
    return NextResponse.json(department, { status: 201 });
  } catch {
    return NextResponse.json({ error: "이미 존재하는 부서명입니다." }, { status: 400 });
  }
}
