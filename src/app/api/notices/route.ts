import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/authz";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role === "ADMIN") {
    const notices = await prisma.notice.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(notices);
  }

  if (!user.departmentId) return NextResponse.json([]);

  const department = await prisma.department.findUnique({
    where: { id: user.departmentId },
    include: { center: true },
  });
  if (!department) return NextResponse.json([]);

  const notices = await prisma.notice.findMany({
    where: {
      OR: [
        { scope: "ALL" },
        { scope: "BRANCH", branchId: department.center.branchId },
        { scope: "CENTER", centerId: department.centerId },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notices);
}
