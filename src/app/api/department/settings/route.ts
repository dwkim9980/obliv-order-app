import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/authz";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "DEPARTMENT" || !user.departmentId) {
    return NextResponse.json({ snackEnabled: false });
  }

  const department = await prisma.department.findUnique({ where: { id: user.departmentId } });
  return NextResponse.json({ snackEnabled: department?.snackEnabled ?? false });
}
