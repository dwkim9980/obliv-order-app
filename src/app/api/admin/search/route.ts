import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

const SORT_MAP: Record<string, any> = {
  date: { requestedAt: undefined },
  itemName: { itemName: undefined },
  quantity: { quantity: undefined },
  totalAmount: { price: undefined },
  status: { status: undefined },
  branch: { department: { center: { branch: { name: undefined } } } },
  center: { department: { center: { name: undefined } } },
  department: { department: { name: undefined } },
  requester: { requester: { name: undefined } },
};

function buildOrderBy(sortBy: string | null, sortDir: string | null) {
  const dir = sortDir === "asc" ? "asc" : "desc";
  if (!sortBy || !SORT_MAP[sortBy]) return { requestedAt: "desc" as const };

  function fill(obj: any): any {
    const result: any = {};
    for (const key in obj) {
      result[key] = obj[key] === undefined ? dir : fill(obj[key]);
    }
    return result;
  }
  return fill(SORT_MAP[sortBy]);
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const status = searchParams.get("status");
  const sortBy = searchParams.get("sortBy");
  const sortDir = searchParams.get("sortDir");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));

  const where: any = {};
  if (q) {
    where.OR = [
      { itemName: { contains: q } },
      { comment: { contains: q } },
      { option: { contains: q } },
      { requester: { name: { contains: q } } },
      { department: { name: { contains: q } } },
      { department: { center: { name: { contains: q } } } },
      { department: { center: { branch: { name: { contains: q } } } } },
    ];
  }
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        department: { include: { center: { include: { branch: true } } } },
        requester: { select: { name: true } },
        attachments: { select: { id: true } },
      },
      orderBy: buildOrderBy(sortBy, sortDir),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}
