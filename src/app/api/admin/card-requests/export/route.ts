import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

const FORM_LABEL: Record<string, string> = {
  NAMETAG: "명찰",
  BUSINESSCARD: "명함",
  UNIFORM: "유니폼",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기",
  ORDERED: "발주완료",
};

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { ids } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "선택된 항목이 없습니다." }, { status: 400 });
  }

  const requests = await prisma.cardRequest.findMany({
    where: { id: { in: ids } },
    include: {
      department: { include: { center: { include: { branch: true } } } },
      requester: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const valueLabels: string[] = [];
  const parsed = requests.map((r) => {
    const values: { label: string; value: string }[] = JSON.parse(r.values);
    for (const v of values) {
      if (!valueLabels.includes(v.label)) valueLabels.push(v.label);
    }
    return { r, values };
  });

  const rows = parsed.map(({ r, values }) => {
    const valueMap: Record<string, string> = {};
    for (const v of values) valueMap[v.label] = v.value;

    const row: Record<string, any> = {
      신청일: r.createdAt.toISOString().slice(0, 10),
      유형: FORM_LABEL[r.formType] ?? r.formType,
      지점: r.department.center.branch.name,
      센터: r.department.center.name,
      부서: r.department.name,
      신청자: r.requester.name,
      수량: r.quantity,
      상태: STATUS_LABEL[r.status] ?? r.status,
    };
    for (const label of valueLabels) row[label] = valueMap[label] ?? "";
    row["센터주소"] = r.centerAddress ?? "";
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "명찰명함신청");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const filename = `명찰명함신청_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
