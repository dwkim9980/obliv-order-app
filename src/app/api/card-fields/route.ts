import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/authz";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fields = await prisma.cardRequestField.findMany({ orderBy: { order: "asc" } });
  const grouped: Record<string, { id: string; label: string }[]> = {
    NAMETAG: [],
    BUSINESSCARD: [],
    UNIFORM: [],
  };
  for (const f of fields) {
    if (!grouped[f.formType]) grouped[f.formType] = [];
    grouped[f.formType].push({ id: f.id, label: f.label });
  }

  let centerAddress: string | null = null;
  if (user.role === "DEPARTMENT" && user.departmentId) {
    const department = await prisma.department.findUnique({
      where: { id: user.departmentId },
      include: { center: true },
    });
    centerAddress = department?.center.address ?? null;
  }

  return NextResponse.json({ fields: grouped, centerAddress });
}
