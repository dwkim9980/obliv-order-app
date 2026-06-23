import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/authz";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "DEPARTMENT" || !user.departmentId) {
    return NextResponse.json([], { status: 200 });
  }

  const requests = await prisma.cardRequest.findMany({
    where: { departmentId: user.departmentId },
    include: { requester: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "DEPARTMENT" || !user.departmentId) {
    return NextResponse.json({ error: "부서 계정만 신청할 수 있습니다." }, { status: 403 });
  }

  const body = await req.json();
  const { formType, quantity, values } = body;

  if (!["NAMETAG", "BUSINESSCARD", "UNIFORM"].includes(formType)) {
    return NextResponse.json({ error: "잘못된 신청서 종류입니다." }, { status: 400 });
  }
  if (!Array.isArray(values) || values.length === 0) {
    return NextResponse.json({ error: "입력 항목이 없습니다." }, { status: 400 });
  }

  const department = await prisma.department.findUnique({
    where: { id: user.departmentId },
    include: { center: true },
  });
  if (!department) {
    return NextResponse.json(
      { error: "세션 정보가 만료되었습니다. 로그아웃 후 다시 로그인해주세요." },
      { status: 401 }
    );
  }
  const centerAddress = formType === "BUSINESSCARD" ? department.center.address : null;

  try {
    const request_ = await prisma.cardRequest.create({
      data: {
        formType,
        quantity: Number(quantity) > 0 ? Number(quantity) : 1,
        values: JSON.stringify(values),
        centerAddress,
        departmentId: user.departmentId,
        requesterId: user.id,
      },
    });
    return NextResponse.json(request_, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "신청 처리 중 오류가 발생했습니다. 로그아웃 후 다시 로그인해주세요." },
      { status: 401 }
    );
  }
}
