import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || currentMonth();

  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);

  const [departments, budgets, orders] = await Promise.all([
    prisma.department.findMany({
      include: { center: { include: { branch: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.budget.findMany({ where: { yearMonth: month } }),
    prisma.order.findMany({
      where: { requestedAt: { gte: start, lt: end }, status: { not: "RETURNED" } },
      select: { departmentId: true, price: true, quantity: true, isSnack: true },
    }),
  ]);

  const budgetByDept = new Map<string, { GENERAL?: typeof budgets[0]; SNACK?: typeof budgets[0] }>();
  for (const b of budgets) {
    const entry = budgetByDept.get(b.departmentId) ?? {};
    if (b.category === "SNACK") entry.SNACK = b;
    else entry.GENERAL = b;
    budgetByDept.set(b.departmentId, entry);
  }

  const spendByDept = new Map<string, { general: number; snack: number }>();
  for (const o of orders) {
    const entry = spendByDept.get(o.departmentId) ?? { general: 0, snack: 0 };
    const amount = o.price;
    if (o.isSnack) entry.snack += amount;
    else entry.general += amount;
    spendByDept.set(o.departmentId, entry);
  }

  const result = departments.map((d) => {
    const budgetEntry = budgetByDept.get(d.id) ?? {};
    const spend = spendByDept.get(d.id) ?? { general: 0, snack: 0 };
    const generalBudget = budgetEntry.GENERAL;
    const snackBudget = budgetEntry.SNACK;
    return {
      departmentId: d.id,
      departmentName: d.name,
      centerName: d.center.name,
      branchName: d.center.branch.name,
      snackEnabled: d.snackEnabled,
      budgetId: generalBudget?.id ?? null,
      amount: generalBudget?.amount ?? null,
      actualSpend: spend.general,
      isUnset: !generalBudget,
      overBudget: generalBudget != null && spend.general > generalBudget.amount,
      snackBudgetId: snackBudget?.id ?? null,
      snackAmount: snackBudget?.amount ?? null,
      snackActualSpend: spend.snack,
      snackIsUnset: !snackBudget,
      snackOverBudget: snackBudget != null && spend.snack > snackBudget.amount,
    };
  });

  return NextResponse.json({ month, departments: result });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { departmentId, month, amount, category } = await req.json();
  if (!departmentId || !month || amount === undefined || amount === null) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
  }
  if (Number(amount) < 0) {
    return NextResponse.json({ error: "예산은 0 이상이어야 합니다." }, { status: 400 });
  }

  const budgetCategory = category === "SNACK" ? "SNACK" : "GENERAL";

  const budget = await prisma.budget.upsert({
    where: { departmentId_yearMonth_category: { departmentId, yearMonth: month, category: budgetCategory } },
    update: { amount: Number(amount) },
    create: { departmentId, yearMonth: month, category: budgetCategory, amount: Number(amount) },
  });

  return NextResponse.json(budget, { status: 201 });
}
