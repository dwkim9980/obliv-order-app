import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const formType = searchParams.get("formType");
  const status = searchParams.get("status");
  const branchId = searchParams.get("branchId");
  const centerId = searchParams.get("centerId");
  const departmentId = searchParams.get("departmentId");

  const where: any = {};
  if (formType) where.formType = formType;
  if (status) where.status = status;
  if (departmentId) where.departmentId = departmentId;
  else if (centerId) where.department = { centerId };
  else if (branchId) where.department = { center: { branchId } };

  const requests = await prisma.cardRequest.findMany({
    where,
    include: {
      department: { include: { center: { include: { branch: true } } } },
      requester: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}
