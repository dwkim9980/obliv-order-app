import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/authz";

function toNumber(value: unknown): number | null {
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const branchId = searchParams.get("branchId");
  const centerId = searchParams.get("centerId");
  const departmentId = searchParams.get("departmentId");
  const scope = searchParams.get("scope"); // "active" | "history" (department only)

  const where: any = {};

  if (user.role === "DEPARTMENT") {
    if (!user.departmentId) return NextResponse.json([], { status: 200 });
    where.departmentId = user.departmentId;
    if (scope === "active" || !scope) {
      where.status = { in: ["PENDING", "ORDERED", "HOLD"] };
    }
  } else {
    if (departmentId) where.departmentId = departmentId;
    else if (centerId) where.department = { centerId };
    else if (branchId) where.department = { center: { branchId } };
    const isSnack = searchParams.get("isSnack");
    if (isSnack === "true") where.isSnack = true;
    else if (isSnack === "false") where.isSnack = false;
    const status = searchParams.get("status");
    if (status) where.status = status;
  }

  if (from || to) {
    where.requestedAt = {};
    if (from) where.requestedAt.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setDate(end.getDate() + 1);
      where.requestedAt.lt = end;
    }
  } else if (month) {
    const [y, m] = month.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    where.requestedAt = { gte: start, lt: end };
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      department: { include: { center: { include: { branch: true } } } },
      requester: { select: { name: true, username: true } },
      attachments: {
        select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true },
      },
    },
    orderBy: { requestedAt: "desc" },
  });

  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { itemName, quantity, option, price, purchaseLink, departmentId, isSnack } = body;

  if (!itemName || !quantity || price === undefined || price === null) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
  }

  const quantityNum = toNumber(quantity);
  const priceNum = toNumber(price);
  if (quantityNum === null || priceNum === null) {
    return NextResponse.json({ error: "수량 또는 금액이 올바르지 않습니다." }, { status: 400 });
  }

  const targetDepartmentId = user.role === "DEPARTMENT" ? user.departmentId : departmentId;
  if (!targetDepartmentId) {
    return NextResponse.json({ error: "부서를 지정해야 합니다." }, { status: 400 });
  }

  let snackFlag = false;
  if (isSnack) {
    const department = await prisma.department.findUnique({ where: { id: targetDepartmentId } });
    snackFlag = !!department?.snackEnabled;
  }

  const order = await prisma.order.create({
    data: {
      itemName,
      quantity: quantityNum,
      option: option || null,
      price: priceNum,
      purchaseLink: purchaseLink || null,
      isSnack: snackFlag,
      departmentId: targetDepartmentId,
      requesterId: user.id,
    },
  });

  return NextResponse.json(order, { status: 201 });
}
