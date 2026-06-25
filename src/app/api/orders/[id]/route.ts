import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/authz";

const ADMIN_STATUSES = ["PENDING", "ORDERED", "HOLD", "CLOSED"];

function toNumber(value: unknown): number | null {
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

async function loadOrder(orderId: string, user: { role: string; departmentId: string | null }) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return null;
  if (user.role === "ADMIN") return order;
  if (order.departmentId === user.departmentId) return order;
  return null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await loadOrder(id, user);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: any = {};

  if (user.role === "ADMIN") {
    if (body.status !== undefined) {
      if (!ADMIN_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "올바르지 않은 상태입니다." }, { status: 400 });
      }
      if (body.status === "HOLD" && !body.comment && !order.comment) {
        return NextResponse.json({ error: "보류 처리 시 코멘트를 입력하세요." }, { status: 400 });
      }
      data.status = body.status;
    }
    if (body.comment !== undefined) {
      data.comment = body.comment || null;
      data.commentAcknowledged = false;
    }
    if (body.itemName !== undefined) data.itemName = body.itemName;
    if (body.quantity !== undefined) {
      const n = toNumber(body.quantity);
      if (n === null) return NextResponse.json({ error: "수량이 올바르지 않습니다." }, { status: 400 });
      data.quantity = n;
    }
    if (body.option !== undefined) data.option = body.option || null;
    if (body.price !== undefined) {
      const n = toNumber(body.price);
      if (n === null) return NextResponse.json({ error: "금액이 올바르지 않습니다." }, { status: 400 });
      data.price = n;
    }
    if (body.purchaseLink !== undefined) data.purchaseLink = body.purchaseLink || null;
  } else {
    // DEPARTMENT
    if (body.commentAcknowledged !== undefined) {
      data.commentAcknowledged = Boolean(body.commentAcknowledged);
    } else if (body.arrivalConfirmed !== undefined) {
      if (order.status !== "ORDERED") {
        return NextResponse.json(
          { error: "주문 처리된 항목만 도착확인할 수 있습니다." },
          { status: 400 }
        );
      }
      data.arrivalConfirmed = Boolean(body.arrivalConfirmed);
    } else if (body.status !== undefined) {
      if (body.status !== "RETURNED") {
        return NextResponse.json({ error: "해당 상태로 변경할 권한이 없습니다." }, { status: 403 });
      }
      if (!["ORDERED", "CLOSED"].includes(order.status)) {
        return NextResponse.json(
          { error: "주문 처리된 항목만 반품할 수 있습니다." },
          { status: 400 }
        );
      }
      data.status = "RETURNED";
    } else if (order.status === "PENDING") {
      if (body.itemName !== undefined) data.itemName = body.itemName;
      if (body.quantity !== undefined) {
        const n = toNumber(body.quantity);
        if (n === null) return NextResponse.json({ error: "수량이 올바르지 않습니다." }, { status: 400 });
        data.quantity = n;
      }
      if (body.option !== undefined) data.option = body.option || null;
      if (body.price !== undefined) {
        const n = toNumber(body.price);
        if (n === null) return NextResponse.json({ error: "금액이 올바르지 않습니다." }, { status: 400 });
        data.price = n;
      }
      if (body.purchaseLink !== undefined) data.purchaseLink = body.purchaseLink || null;
    } else {
      return NextResponse.json({ error: "처리 중인 항목은 수정할 수 없습니다." }, { status: 400 });
    }
  }

  const updated = await prisma.order.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await loadOrder(id, user);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (order.status === "CLOSED") {
    return NextResponse.json(
      { error: "마감 상태는 삭제할 수 없습니다. 먼저 상태를 변경하세요." },
      { status: 400 }
    );
  }

  if (user.role === "DEPARTMENT" && order.status !== "PENDING") {
    return NextResponse.json({ error: "대기 상태의 항목만 삭제할 수 있습니다." }, { status: 400 });
  }

  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
