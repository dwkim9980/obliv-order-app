import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from"); // YYYY-MM-DD
  const to = searchParams.get("to"); // YYYY-MM-DD
  const month = searchParams.get("month"); // YYYY-MM (legacy fallback)

  const where: any = {};
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
    include: { department: { include: { center: { include: { branch: true } } } } },
  });

  const byDepartment = new Map<
    string,
    {
      departmentId: string;
      departmentName: string;
      centerName: string;
      branchName: string;
      count: number;
      totalAmount: number;
      snackCount: number;
      snackAmount: number;
    }
  >();

  let totalAmount = 0;
  let totalCount = 0;
  let snackTotalAmount = 0;
  let snackTotalCount = 0;

  for (const o of orders) {
    const key = o.departmentId;
    const entry = byDepartment.get(key) ?? {
      departmentId: key,
      departmentName: o.department.name,
      centerName: o.department.center.name,
      branchName: o.department.center.branch.name,
      count: 0,
      totalAmount: 0,
      snackCount: 0,
      snackAmount: 0,
    };
    const amount = o.price;
    if (o.isSnack) {
      entry.snackCount += 1;
      entry.snackAmount += amount;
      snackTotalCount += 1;
      snackTotalAmount += amount;
    } else {
      entry.count += 1;
      entry.totalAmount += amount;
      totalCount += 1;
      totalAmount += amount;
    }
    byDepartment.set(key, entry);
  }

  return NextResponse.json({
    totalAmount,
    totalCount,
    snackTotalAmount,
    snackTotalCount,
    byDepartment: Array.from(byDepartment.values()).sort((a, b) => b.totalAmount - a.totalAmount),
  });
}
