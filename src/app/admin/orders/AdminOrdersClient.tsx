"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDateKr } from "@/lib/formatDate";
import AttachmentList, { Attachment } from "@/components/AttachmentList";
import { detectVendor } from "@/lib/vendor";
import { useColumnLayout } from "@/lib/useColumnLayout";
import ResizableTh from "@/components/ResizableTh";

type Department = { id: string; name: string };
type Center = { id: string; name: string; departments: Department[] };
type Branch = { id: string; name: string; centers: Center[] };

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
  requestedAt: string;
  department: { name: string; center: { name: string; branch: { name: string } } };
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

const ADMIN_STATUS_OPTIONS = ["PENDING", "ORDERED", "HOLD", "CLOSED"];

const ORDER_COLUMNS = [
  { id: "date", label: "신청일", width: 100 },
  { id: "branch", label: "지점", width: 70 },
  { id: "center", label: "센터", width: 80 },
  { id: "department", label: "부서", width: 90 },
  { id: "itemName", label: "물품명", width: 200 },
  { id: "attachment", label: "첨부", width: 70 },
  { id: "quantity", label: "수량", width: 60 },
  { id: "option", label: "옵션", width: 110 },
  { id: "totalAmount", label: "총금액", width: 100, align: "right" as const },
  { id: "vendor", label: "구매처", width: 80 },
  { id: "link", label: "링크", width: 60 },
  { id: "status", label: "상태", width: 110 },
  { id: "comment", label: "코멘트", width: 140 },
];

export default function AdminOrdersClient() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState("");
  const [centerId, setCenterId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [isSnackFilter, setIsSnackFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});
  const [savingQty, setSavingQty] = useState(false);

  useEffect(() => {
    fetch("/api/admin/branches")
      .then((r) => r.json())
      .then(setBranches);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (departmentId) params.set("departmentId", departmentId);
    else if (centerId) params.set("centerId", centerId);
    else if (branchId) params.set("branchId", branchId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (isSnackFilter) params.set("isSnack", isSnackFilter);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/orders?${params.toString()}`);
    const data = await res.json();
    setOrders(data);
    setCommentDrafts(
      Object.fromEntries(data.map((o: Order) => [o.id, o.comment || ""]))
    );
    setSelected(new Set());
    setLoading(false);
  }, [branchId, centerId, departmentId, from, to, isSnackFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(order: Order, status: string) {
    let comment: string | undefined;
    if (status === "HOLD" && !order.comment) {
      const input = prompt("보류 사유를 입력하세요.");
      if (!input) return;
      comment = input;
    }
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...(comment ? { comment } : {}) }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "변경에 실패했습니다.");
      return;
    }
    load();
  }

  async function handleCommentSave(id: string) {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: commentDrafts[id] }),
    });
    load();
  }

  async function handleDelete(order: Order) {
    if (order.status === "CLOSED") {
      alert("마감 상태는 삭제할 수 없습니다. 먼저 상태를 변경하세요.");
      return;
    }
    if (!confirm("이 발주 항목을 삭제할까요?")) return;
    const res = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error);
      return;
    }
    load();
  }

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleSelectAll() {
    if (selected.size === orders.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orders.map((o) => o.id)));
    }
  }

  async function handleBulk(status: "ORDERED" | "CLOSED") {
    if (selected.size === 0) return;
    const label = status === "ORDERED" ? "주문" : "마감";
    if (!confirm(`선택한 ${selected.size}건을 '${label}' 상태로 일괄 변경할까요?`)) return;
    const res = await fetch("/api/orders/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "일괄 처리에 실패했습니다.");
      return;
    }
    load();
  }

  function formatDate(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function setMonthOf(monthIndex: number) {
    const year = Number((from || to || formatDate(new Date())).slice(0, 4));
    setFrom(formatDate(new Date(year, monthIndex, 1)));
    setTo(formatDate(new Date(year, monthIndex + 1, 0)));
  }

  function handleExportExcel() {
    const params = new URLSearchParams();
    if (departmentId) params.set("departmentId", departmentId);
    else if (centerId) params.set("centerId", centerId);
    else if (branchId) params.set("branchId", branchId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.location.href = `/api/admin/export?${params.toString()}`;
  }

  function handleOpenLinks() {
    const links = orders
      .filter((o) => selected.has(o.id) && o.purchaseLink)
      .map((o) => o.purchaseLink as string);
    if (links.length === 0) {
      alert("선택한 항목 중 구매링크가 있는 항목이 없습니다.");
      return;
    }
    if (links.length > 3) {
      const ok = confirm(
        `${links.length}개의 링크를 새 탭으로 엽니다. 브라우저 팝업 차단 설정에 따라 일부만 열릴 수 있습니다. 계속할까요?`
      );
      if (!ok) return;
    }
    links.forEach((link) => window.open(link, "_blank", "noopener,noreferrer"));
  }

  function escapeHtml(s: string) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  async function handleCopyForCartHelper() {
    const items = orders.filter((o) => selected.has(o.id) && o.purchaseLink);
    if (items.length === 0) {
      alert("선택한 항목 중 구매링크가 있는 항목이 없습니다.");
      return;
    }

    const rowsHtml = items
      .map(
        (o) =>
          `<tr><td>${escapeHtml(o.itemName)}</td><td>${escapeHtml(o.department.name)}</td><td><a href="${o.purchaseLink}">구매링크</a></td><td>${o.quantity}</td><td>${escapeHtml(o.option || "")}</td></tr>`
      )
      .join("");
    const html = `<table><tbody>${rowsHtml}</tbody></table>`;
    const text = items
      .map((o) => [o.itemName, o.department.name, o.purchaseLink, o.quantity, o.option || ""].join("\t"))
      .join("\n");

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
      alert(
        `${items.length}건이 클립보드에 복사되었습니다.\n\n쿠팡 장바구니 도우미 확장프로그램의 작업창을 열고, 점선 박스를 클릭한 뒤 Ctrl+V로 붙여넣어 주세요.\n(열 매핑 단계에서 물품명/부서/링크/수량/옵션 순서로 잡혀있는지 한 번 확인해주세요.)`
      );
    } catch (err) {
      alert("클립보드 복사에 실패했습니다. 브라우저 권한을 확인해주세요: " + (err as Error).message);
    }
  }

  function handleOpenQtyModal() {
    if (selected.size === 0) return;
    const drafts: Record<string, string> = {};
    orders
      .filter((o) => selected.has(o.id))
      .forEach((o) => {
        drafts[o.id] = String(o.quantity);
      });
    setQtyDrafts(drafts);
    setShowQtyModal(true);
  }

  async function handleSaveQty() {
    setSavingQty(true);
    try {
      await Promise.all(
        Object.entries(qtyDrafts).map(([id, qty]) =>
          fetch(`/api/orders/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quantity: Number(qty) }),
          })
        )
      );
      setShowQtyModal(false);
      load();
    } finally {
      setSavingQty(false);
    }
  }

  const { columns, startResize, onDragStart, onDragOverCol, onDropCol, resetLayout } =
    useColumnLayout("admin-orders", ORDER_COLUMNS);

  const selectedBranch = branches.find((b) => b.id === branchId);
  const selectedCenter = selectedBranch?.centers.find((c) => c.id === centerId);
  const totalAmount = orders.reduce((sum, o) => sum + o.price, 0);
  const selectedAmount = orders
    .filter((o) => selected.has(o.id))
    .reduce((sum, o) => sum + o.price, 0);
  const selectedOrdersForModal = orders.filter((o) => o.id in qtyDrafts);

  function handleSortClick(colId: string) {
    if (sortBy !== colId) {
      setSortBy(colId);
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortDir("asc");
    } else {
      setSortBy(null);
      setSortDir(null);
    }
  }

  function sortValue(colId: string, o: Order): string | number {
    switch (colId) {
      case "date":
        return new Date(o.requestedAt).getTime();
      case "branch":
        return o.department.center.branch.name;
      case "center":
        return o.department.center.name;
      case "department":
        return o.department.name;
      case "itemName":
        return o.itemName;
      case "quantity":
        return o.quantity;
      case "option":
        return o.option || "";
      case "totalAmount":
        return o.price;
      case "vendor":
        return detectVendor(o.purchaseLink);
      case "status":
        return STATUS_LABEL[o.status] ?? o.status;
      case "comment":
        return o.comment || "";
      default:
        return "";
    }
  }

  const displayedOrders = (() => {
    if (!sortBy || !sortDir) return orders;
    const copy = [...orders];
    copy.sort((a, b) => {
      const va = sortValue(sortBy, a);
      const vb = sortValue(sortBy, b);
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  })();

  function renderCell(colId: string, o: Order) {
    switch (colId) {
      case "date":
        return formatDateKr(o.requestedAt);
      case "branch":
        return o.department.center.branch.name;
      case "center":
        return o.department.center.name;
      case "department":
        return o.department.name;
      case "itemName":
        return (
          <>
            {o.itemName}
            {o.isSnack && (
              <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                간식
              </span>
            )}
          </>
        );
      case "attachment":
        return <AttachmentList orderId={o.id} attachments={o.attachments} onChange={load} />;
      case "quantity":
        return o.quantity;
      case "option":
        return o.option || "-";
      case "totalAmount":
        return `${o.price.toLocaleString()}원`;
      case "vendor":
        return detectVendor(o.purchaseLink);
      case "link":
        return o.purchaseLink ? (
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
        );
      case "status":
        return o.status === "RETURNED" ? (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            반품
          </span>
        ) : (
          <select
            value={o.status}
            onChange={(e) => handleStatusChange(o, e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs"
          >
            {ADMIN_STATUS_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {STATUS_LABEL[k]}
              </option>
            ))}
          </select>
        );
      case "comment":
        return (
          <input
            value={commentDrafts[o.id] ?? ""}
            onChange={(e) => setCommentDrafts({ ...commentDrafts, [o.id]: e.target.value })}
            onBlur={() => handleCommentSave(o.id)}
            placeholder="코멘트"
            className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">전체 발주 내역</h1>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <select
          value={branchId}
          onChange={(e) => {
            setBranchId(e.target.value);
            setCenterId("");
            setDepartmentId("");
          }}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">전체 지점</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={centerId}
          onChange={(e) => {
            setCenterId(e.target.value);
            setDepartmentId("");
          }}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          disabled={!selectedBranch}
        >
          <option value="">전체 센터</option>
          {selectedBranch?.centers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          disabled={!selectedCenter}
        >
          <option value="">전체 부서</option>
          {selectedCenter?.departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2 text-sm">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5"
          />
          <span className="text-gray-400">~</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5"
          />
        </div>
        <div className="flex gap-1 text-sm">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <button
              key={m}
              onClick={() => setMonthOf(m - 1)}
              className="rounded-md border border-gray-300 px-2 py-1 hover:bg-gray-50"
              title={`${m}월 1일~말일`}
            >
              {m}
            </button>
          ))}
        </div>
        <select
          value={isSnackFilter}
          onChange={(e) => setIsSnackFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">일반+간식 전체</option>
          <option value="false">일반만</option>
          <option value="true">간식만</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">전체 상태</option>
          {Object.entries(STATUS_LABEL).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        {(from || to) && (
          <button
            onClick={() => {
              setFrom("");
              setTo("");
            }}
            className="text-sm text-gray-500 hover:underline"
          >
            기간 필터 초기화
          </button>
        )}
        <button
          onClick={handleExportExcel}
          className="ml-auto rounded-md border border-emerald-300 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50"
        >
          엑셀 다운로드 (현재 필터 기준)
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <span className="text-sm text-gray-600">{selected.size}건 선택됨</span>
        <button
          onClick={() => handleBulk("ORDERED")}
          disabled={selected.size === 0}
          className="rounded-md border border-blue-300 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-40"
        >
          선택 항목 주문처리
        </button>
        <button
          onClick={() => handleBulk("CLOSED")}
          disabled={selected.size === 0}
          className="rounded-md border border-green-300 px-3 py-1.5 text-sm text-green-700 hover:bg-green-50 disabled:opacity-40"
        >
          선택 항목 마감처리
        </button>
        <button
          onClick={handleOpenLinks}
          disabled={selected.size === 0}
          className="rounded-md border border-purple-300 px-3 py-1.5 text-sm text-purple-700 hover:bg-purple-50 disabled:opacity-40"
        >
          선택 링크 한번에 열기
        </button>
        <button
          onClick={handleCopyForCartHelper}
          disabled={selected.size === 0}
          className="rounded-md border border-teal-300 px-3 py-1.5 text-sm text-teal-700 hover:bg-teal-50 disabled:opacity-40"
        >
          장바구니 도우미로 복사
        </button>
        <button
          onClick={handleOpenQtyModal}
          disabled={selected.size === 0}
          className="rounded-md border border-orange-300 px-3 py-1.5 text-sm text-orange-700 hover:bg-orange-50 disabled:opacity-40"
        >
          선택 항목 수량 변경
        </button>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            총 {orders.length}건 · 합계 {totalAmount.toLocaleString()}원
            {selected.size > 0 && (
              <span className="ml-2 text-blue-700">
                · 선택 {selected.size}건 합계 {selectedAmount.toLocaleString()}원
              </span>
            )}
          </p>
          <button onClick={resetLayout} className="text-xs text-gray-500 hover:underline">
            열 배치 초기화
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-gray-500">불러오는 중...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-gray-500">조건에 맞는 발주 내역이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table
              className="table-fixed text-sm"
              style={{ width: 32 + 50 + columns.reduce((s, c) => s + c.width, 0) }}
            >
              <colgroup>
                <col style={{ width: 32 }} />
                {columns.map((c) => (
                  <col key={c.id} style={{ width: c.width }} />
                ))}
                <col style={{ width: 50 }} />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2 pr-3">
                    <input
                      type="checkbox"
                      checked={orders.length > 0 && selected.size === orders.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  {columns.map((c) => (
                    <ResizableTh
                      key={c.id}
                      column={c}
                      onResizeStart={startResize}
                      onDragStart={onDragStart}
                      onDragOver={onDragOverCol}
                      onDrop={onDropCol}
                      sortDir={sortBy === c.id ? sortDir : null}
                      onSortClick={handleSortClick}
                    />
                  ))}
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {displayedOrders.map((o) => (
                  <tr key={o.id} className="border-b border-gray-100">
                    <td className="truncate py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={selected.has(o.id)}
                        onChange={() => toggleSelect(o.id)}
                      />
                    </td>
                    {columns.map((c) => (
                      <td
                        key={c.id}
                        className={`overflow-hidden truncate py-2 pr-3 ${c.align === "right" ? "text-right" : ""}`}
                      >
                        {renderCell(c.id, o)}
                      </td>
                    ))}
                    <td className="truncate py-2 pr-3">
                      <button
                        onClick={() => handleDelete(o)}
                        disabled={o.status === "CLOSED"}
                        className="text-xs text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-300 disabled:no-underline"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showQtyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">선택 항목 수량 변경</h2>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {selectedOrdersForModal.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex-1 truncate">
                    {o.department.name} · {o.itemName}
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={qtyDrafts[o.id] ?? ""}
                    onChange={(e) =>
                      setQtyDrafts({ ...qtyDrafts, [o.id]: e.target.value })
                    }
                    className="w-24 rounded-md border border-gray-300 px-2 py-1 text-right"
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowQtyModal(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSaveQty}
                disabled={savingQty}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {savingQty ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
