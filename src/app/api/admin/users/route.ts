import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const users = await prisma.user.findMany({
    include: { department: { include: { center: { include: { branch: true } } } } },
    orderBy: { createdAt: "asc" },
  });
  const safe = users.map(({ passwordHash, ...u }) => u);
  return NextResponse.json(safe);
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { username, password, name, role, departmentId } = await req.json();
  if (!username || !password || !name || !role) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
  }
  if (role === "DEPARTMENT" && !departmentId) {
    return NextResponse.json({ error: "부서 계정은 부서를 지정해야 합니다." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "이미 사용 중인 아이디입니다." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      name,
      role,
      departmentId: role === "DEPARTMENT" ? departmentId : null,
    },
  });

  const { passwordHash: _ph, ...safe } = user;
  return NextResponse.json(safe, { status: 201 });
}
