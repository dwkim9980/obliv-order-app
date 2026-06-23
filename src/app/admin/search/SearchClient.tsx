"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDateKr } from "@/lib/formatDate";

type Order = {
  id: string;
  itemName: string;
  quantity: number;
  option: string | null;
  price: number;
  purchaseLink: string | null;
  status: string;
  comment: string | null;
  requestedAt: string;
  department: { name: string; center: { name: string; branch: { name: string } } };
  requester: { name: string };
  attachments: { id: string }[];
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기",
  ORDERED: "주문",
  HOLD: "보류",
  CLOSED: "마감",
  RETURNED: "반품",
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const COLUMNS: { id: string; label: string; sortable: boolean; align?: "right" }[] = [
  { id: "date", label: "신청일", sortable: true },
  { id: "branch", label: "지점", sortable: true },
  { id: "center", label: "센터", sortable: true },
  { id: "department", label: "부서", sortable: true },
  { id: "itemName", label: "물품명", sortable: true },
  { id: "quantity", label: "수량", sortable: true },
  { id: "totalAmount", label: "금액", sortable: true, align: "right" },
  { id: "status", label: "상태", sortable: true },
  { id: "comment", label: "코멘트", sortable: false },
  { id: "attachment", label: "첨부", sortable: false },
  { id: "requester", label: "신청자", sortable: true },
];

export default function SearchClient() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageSizeInput, setPageSizeInput] = useState(String(DEFAULT_PAGE_SIZE));
  const [items, setItems] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (query: string, st: string, sBy: string | null, sDir: string | null, p: number, size: number) => {
      setLoading(true);
      const params = new URLSearchParams({ q: query, page: String(p), pageSize: String(size) });
      if (st) params.set("status", st);
      if (sBy && sDir) {
        params.set("sortBy", sBy);
        params.set("sortDir", sDir);
      }
      const res = await fetch(`/api/admin/search?${params.toString()}`);
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
      setLoading(false);
    },
    []
  );

  useEffect(() => {
    load(q, status, sortBy, sortDir, page, pageSize);
  }, [q, status, sortBy, sortDir, page, pageSize, load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
  }

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
    setPage(1);
  }

  function applyPageSize() {
    const n = Number(pageSizeInput);
    if (!Number.isInteger(n) || n < 1) {
      alert("1 이상의 숫자를 입력하세요.");
      setPageSizeInput(String(pageSize));
      return;
    }
    const clamped = Math.min(MAX_PAGE_SIZE, n);
    if (clamped !== n) {
      alert(`한 번에 최대 ${MAX_PAGE_SIZE}개까지 볼 수 있습니다.`);
    }
    setPageSizeInput(String(clamped));
    setPageSize(clamped);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">발주 검색</h1>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          placeholder="물품명, 옵션, 코멘트, 신청자, 부서/센터/지점명으로 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">전체 상태</option>
          {Object.entries(STATUS_LABEL).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white">
          검색
        </button>
      </form>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">총 {total}건</p>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-gray-500">페이지당</span>
              <input
                type="number"
                min={1}
                max={MAX_PAGE_SIZE}
                value={pageSizeInput}
                onChange={(e) => setPageSizeInput(e.target.value)}
                onBlur={applyPageSize}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyPageSize();
                  }
                }}
                className="w-16 rounded-md border border-gray-300 px-2 py-1 text-right"
              />
              <span className="text-gray-500">개 (최대 {MAX_PAGE_SIZE})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border border-gray-300 px-2 py-1 disabled:opacity-40"
              >
                이전
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md border border-gray-300 px-2 py-1 disabled:opacity-40"
              >
                다음
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">불러오는 중...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500">검색 결과가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col style={{ width: "9%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "6%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  {COLUMNS.map((c) => (
                    <th
                      key={c.id}
                      onClick={() => c.sortable && handleSortClick(c.id)}
                      className={`py-2 pr-3 ${c.sortable ? "cursor-pointer select-none" : ""} ${c.align === "right" ? "text-right" : ""}`}
                    >
                      {c.label}
                      {sortBy === c.id && (
                        <span className="ml-1 text-gray-400">{sortDir === "asc" ? "▲" : "▼"}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((o) => (
                  <tr key={o.id} className="border-b border-gray-100">
                    <td className="truncate py-2 pr-3 whitespace-nowrap">
                      {formatDateKr(o.requestedAt)}
                    </td>
                    <td className="truncate py-2 pr-3">{o.department.center.branch.name}</td>
                    <td className="truncate py-2 pr-3">{o.department.center.name}</td>
                    <td className="truncate py-2 pr-3">{o.department.name}</td>
                    <td className="truncate py-2 pr-3">{o.itemName}</td>
                    <td className="truncate py-2 pr-3">{o.quantity}</td>
                    <td className="truncate py-2 pr-3 text-right">{o.price.toLocaleString()}원</td>
                    <td className="truncate py-2 pr-3">{STATUS_LABEL[o.status] ?? o.status}</td>
                    <td className="truncate py-2 pr-3 text-xs text-gray-500">{o.comment || "-"}</td>
                    <td className="truncate py-2 pr-3">{o.attachments.length > 0 ? `${o.attachments.length}개` : "-"}</td>
                    <td className="truncate py-2 pr-3">{o.requester?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
