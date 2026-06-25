import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기",
  ORDERED: "발주완료",
  HOLD: "보류",
  CLOSED: "마감",
  RETURNED: "반품",
};

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const branchId = searchParams.get("branchId");
  const centerId = searchParams.get("centerId");
  const departmentId = searchParams.get("departmentId");

  const where: any = {};
  if (departmentId) where.departmentId = departmentId;
  else if (centerId) where.department = { centerId };
  else if (branchId) where.department = { center: { branchId } };

  if (from || to) {
    where.requestedAt = {};
    if (from) where.requestedAt.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setDate(end.getDate() + 1);
      where.requestedAt.lt = end;
    }
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      department: { include: { center: { include: { branch: true } } } },
      requester: { select: { name: true } },
    },
    orderBy: { requestedAt: "asc" },
  });

  const rows = orders.map((o) => ({
    신청일: o.requestedAt.toISOString().slice(0, 10),
    지점: o.department.center.branch.name,
    센터: o.department.center.name,
    부서: o.department.name,
    물품명: o.itemName,
    옵션확인: o.option ?? "",
    필요수량: o.quantity,
    총금액: o.price,
    구매링크: o.purchaseLink ?? "",
    상태: STATUS_LABEL[o.status] ?? o.status,
    코멘트: o.comment ?? "",
    신청자: o.requester.name,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 12 },
    { wch: 8 },
    { wch: 10 },
    { wch: 12 },
    { wch: 24 },
    { wch: 16 },
    { wch: 8 },
    { wch: 12 },
    { wch: 30 },
    { wch: 8 },
    { wch: 24 },
    { wch: 10 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "발주내역");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  const todayLabel = new Date().toISOString().slice(0, 10);
  const filename = `발주내역_${from || "전체"}_${to || todayLabel}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
