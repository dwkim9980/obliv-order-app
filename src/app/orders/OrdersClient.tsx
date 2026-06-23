"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import { formatDateKr } from "@/lib/formatDate";
import Link from "next/link";
import { ORDER_DRAFT_KEY } from "./history/OrderHistoryClient";
import AttachmentList, { Attachment } from "@/components/AttachmentList";
import { detectVendor } from "@/lib/vendor";
import NoticeBanner from "@/components/NoticeBanner";

type Order = {
  id: string;
  itemName: string;
  quantity: number;
  option: string | null;
  price: number;
  purchaseLink: string | null;
  status: string;
  comment: string | null;
  commentAcknowledged: boolean;
  isSnack: boolean;
  requestedAt: string;
  requester: { name: string };
  attachments: Attachment[];
};

function formatThousands(raw: string) {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString();
}

export default function OrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackEnabled, setSnackEnabled] = useState(false);
  const [form, setForm] = useState({
    itemName: "",
    quantity: "1",
    option: "",
    price: "",
    purchaseLink: "",
  });
  const [isSnack, setIsSnack] = useState(false);
  const [error, setError] = useState("");

  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editForm, setEditForm] = useState({ itemName: "", purchaseLink: "", quantity: "1", price: "" });
  const [editError, setEditError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/orders?scope=active");
    const data = await res.json();
    setOrders(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    fetch("/api/department/settings")
      .then((r) => r.json())
      .then((d) => setSnackEnabled(!!d.snackEnabled));
  }, [load]);

  useEffect(() => {
    const draft = sessionStorage.getItem(ORDER_DRAFT_KEY);
    if (draft) {
      try {
        setForm(JSON.parse(draft));
      } catch {
        // ignore malformed draft
      }
      sessionStorage.removeItem(ORDER_DRAFT_KEY);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.itemName || !form.quantity || !form.price) {
      setError("물품명, 필요수량, 총금액은 필수입니다.");
      return;
    }
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        price: form.price.replace(/[^0-9]/g, ""),
        isSnack,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "등록에 실패했습니다.");
      return;
    }
    setForm({ itemName: "", quantity: "1", option: "", price: "", purchaseLink: "" });
    setIsSnack(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("이 발주 항목을 삭제할까요?")) return;
    const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error);
      return;
    }
    load();
  }

  async function handleAcknowledge(id: string) {
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentAcknowledged: true }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "처리에 실패했습니다.");
      return;
    }
    load();
  }

  function openEdit(o: Order) {
    setEditingOrder(o);
    setEditForm({
      itemName: o.itemName,
      purchaseLink: o.purchaseLink || "",
      quantity: String(o.quantity),
      price: o.price.toLocaleString(),
    });
    setEditError("");
  }

  async function handleEditSave() {
    if (!editingOrder) return;
    setEditError("");
    const res = await fetch(`/api/orders/${editingOrder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemName: editForm.itemName,
        purchaseLink: editForm.purchaseLink,
        quantity: editForm.quantity,
        price: editForm.price.replace(/[^0-9]/g, ""),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setEditError(data.error || "수정에 실패했습니다.");
      return;
    }
    setEditingOrder(null);
    load();
  }

  const totalAmount = orders.reduce((sum, o) => sum + o.price, 0);

  return (
    <div className="space-y-6">
      <NoticeBanner />

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">새 발주 등록</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-6">
          <input
            placeholder="물품명*"
            value={form.itemName}
            onChange={(e) => setForm({ ...form, itemName: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            type="number"
            min={1}
            placeholder="필요수량*"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="옵션확인"
            value={form.option}
            onChange={(e) => setForm({ ...form, option: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            inputMode="numeric"
            placeholder="총금액*"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: formatThousands(e.target.value) })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-right"
          />
          <input
            placeholder="구매링크"
            value={form.purchaseLink}
            onChange={(e) => setForm({ ...form, purchaseLink: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-3 sm:col-span-6">
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
            >
              등록
            </button>
            {snackEnabled && (
              <label className="flex items-center gap-1.5 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={isSnack}
                  onChange={(e) => setIsSnack(e.target.checked)}
                />
                간식 (별도 예산·집계)
              </label>
            )}
          </div>
          {error && (
            <div className="sm:col-span-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">내 부서 발주 내역</h2>
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-600">
              총 {orders.length}건 · 합계 {totalAmount.toLocaleString()}원
            </p>
            <Link href="/orders/history" className="text-sm text-blue-600 hover:underline">
              지난 주문내역 보기 →
            </Link>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">불러오는 중...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-gray-500">처리 중인 발주가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col style={{ width: "6.6%" }} />
                <col style={{ width: "41.9%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "4.4%" }} />
                <col style={{ width: "8.1%" }} />
                <col style={{ width: "8.1%" }} />
                <col style={{ width: "5.9%" }} />
                <col style={{ width: "4.4%" }} />
                <col style={{ width: "6.6%" }} />
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
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <Fragment key={o.id}>
                    <tr className="border-b border-gray-100">
                      <td className="truncate py-2 pr-3 whitespace-nowrap">
                        {formatDateKr(o.requestedAt)}
                      </td>
                      <td className="truncate py-2 pr-3">
                        {o.itemName}
                        {o.isSnack && (
                          <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                            간식
                          </span>
                        )}
                      </td>
                      <td className="overflow-hidden py-2 pr-3">
                        <AttachmentList orderId={o.id} attachments={o.attachments} onChange={load} />
                      </td>
                      <td className="py-2 pr-3">{o.quantity}</td>
                      <td className="truncate py-2 pr-3">{o.option || "-"}</td>
                      <td className="py-2 pr-3 text-right">{o.price.toLocaleString()}원</td>
                      <td className="truncate py-2 pr-3">{detectVendor(o.purchaseLink)}</td>
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
                        {o.status === "PENDING" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEdit(o)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDelete(o.id)}
                              className="text-xs text-red-600 hover:underline"
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {o.comment && !o.commentAcknowledged && (
                      <tr className="border-b border-gray-100 bg-amber-50">
                        <td></td>
                        <td colSpan={7} className="py-1.5 pr-3 text-xs text-amber-700">
                          ⚠ 관리자 코멘트: {o.comment}
                        </td>
                        <td className="py-1.5 pr-3">
                          <button
                            onClick={() => handleAcknowledge(o.id)}
                            className="text-xs font-medium text-amber-700 hover:underline"
                          >
                            확인
                          </button>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">발주 항목 수정</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">물품명</label>
                <input
                  value={editForm.itemName}
                  onChange={(e) => setEditForm({ ...editForm, itemName: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">구매링크</label>
                <input
                  value={editForm.purchaseLink}
                  onChange={(e) => setEditForm({ ...editForm, purchaseLink: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">수량</label>
                  <input
                    type="number"
                    min={1}
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">총금액</label>
                  <input
                    inputMode="numeric"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: formatThousands(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-right text-sm"
                  />
                </div>
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditingOrder(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleEditSave}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
