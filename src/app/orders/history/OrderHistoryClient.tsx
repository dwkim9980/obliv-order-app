"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDateKr } from "@/lib/formatDate";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AttachmentList, { Attachment } from "@/components/AttachmentList";
import { detectVendor } from "@/lib/vendor";

export const ORDER_DRAFT_KEY = "orderDraft";

type Order = {
  id: string;
  itemName: string;
  quantity: number;
  option: string | null;
  price: number;
  purchaseLink: string | null;
  status: string;
  comment: string | null;
  isSnack: boolean;
  arrivalConfirmed: boolean;
  requestedAt: string;
  requester: { name: string };
  attachments: Attachment[];
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기",
  ORDERED: "주문",
  HOLD: "보류",
  CLOSED: "마감",
  RETURNED: "반품",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  ORDERED: "bg-blue-100 text-blue-700",
  HOLD: "bg-amber-100 text-amber-700",
  CLOSED: "bg-green-100 text-green-700",
  RETURNED: "bg-red-100 text-red-700",
};

export default function OrderHistoryClient() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/orders?scope=history");
    setOrders(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleArrivalConfirm(id: string, checked: boolean) {
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ arrivalConfirmed: checked }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "도착확인 처리에 실패했습니다.");
      return;
    }
    load();
  }

  async function handleReturn(id: string) {
    if (!confirm("이 항목을 반품 처리할까요?")) return;
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RETURNED" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "반품 처리에 실패했습니다.");
      return;
    }
    load();
  }

  function handleCopy(o: Order) {
    sessionStorage.setItem(
      ORDER_DRAFT_KEY,
      JSON.stringify({
        itemName: o.itemName,
        quantity: String(o.quantity),
        option: o.option || "",
        price: String(o.price),
        purchaseLink: o.purchaseLink || "",
      })
    );
    router.push("/orders");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">지난 주문내역</h1>
        <Link href="/orders" className="text-sm text-blue-600 hover:underline">
          ← 발주 등록 화면으로
        </Link>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {loading ? (
          <p className="text-sm text-gray-500">불러오는 중...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-gray-500">주문 내역이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col style={{ width: "7%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "5%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "5%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "4%" }} />
                <col style={{ width: "4%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2 pr-3">신청일</th>
                  <th className="py-2 pr-3">물품명</th>
                  <th className="py-2 pr-3">첨부</th>
                  <th className="py-2 pr-3">수량</th>
                  <th className="py-2 pr-3">옵션</th>
                  <th className="py-2 pr-3 text-right">총금액</th>
                  <th className="py-2 pr-3">구매처</th>
                  <th className="py-2 pr-3">링크</th>
                  <th className="py-2 pr-3">상태</th>
                  <th className="py-2 pr-3">코멘트</th>
                  <th className="py-2 pr-3">도착확인</th>
                  <th className="py-2 pr-3"></th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const canReturn = o.status === "ORDERED" || o.status === "CLOSED";
                  return (
                    <tr key={o.id} className="border-b border-gray-100">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {formatDateKr(o.requestedAt)}
                      </td>
                      <td className="py-2 pr-3">
                        {o.itemName}
                        {o.isSnack && (
                          <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                            간식
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <AttachmentList orderId={o.id} attachments={o.attachments} onChange={load} />
                      </td>
                      <td className="py-2 pr-3">{o.quantity}</td>
                      <td className="py-2 pr-3">{o.option || "-"}</td>
                      <td className="py-2 pr-3 text-right">{o.price.toLocaleString()}원</td>
                      <td className="py-2 pr-3">{detectVendor(o.purchaseLink)}</td>
                      <td className="py-2 pr-3">
                        {o.purchaseLink ? (
                          <a
                            href={o.purchaseLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline"
                          >
                            링크
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[o.status]}`}
                        >
                          {STATUS_LABEL[o.status]}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-xs text-gray-500">{o.comment || "-"}</td>
                      <td className="py-2 pr-3">
                        {o.status === "CLOSED" ? (
                          <input
                            type="checkbox"
                            checked={o.arrivalConfirmed}
                            onChange={(e) => handleArrivalConfirm(o.id, e.target.checked)}
                          />
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <button
                          onClick={() => handleReturn(o.id)}
                          disabled={!canReturn}
                          className="text-xs text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-300 disabled:no-underline"
                        >
                          반품
                        </button>
                      </td>
                      <td className="py-2 pr-3">
                        <button
                          onClick={() => handleCopy(o)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          복사해서 재주문
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
