import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/authz";

export async function getAccessibleOrder(orderId: string, user: SessionUser) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return null;
  if (user.role === "ADMIN") return order;
  if (order.departmentId === user.departmentId) return order;
  return null;
}
