"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDateKr } from "@/lib/formatDate";
import Link from "next/link";

type Branch = { id: string; name: string; centers: { id: string; name: string; departments: { id: string; name: string }[] }[] };

type CardRequest = {
  id: string;
  formType: string;
  quantity: number;
  values: string;
  centerAddress: string | null;
  status: string;
  createdAt: string;
  department: { name: string; center: { name: string; branch: { name: string } } };
  requester: { name: string };
};

const FORM_LABEL: Record<string, string> = {
  NAMETAG: "명찰",
  BUSINESSCARD: "명함",
  UNIFORM: "유니폼",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기",
  ORDERED: "발주완료",
};

export default function AdminCardRequestsClient() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [requests, setRequests] = useState<CardRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [formType, setFormType] = useState("");
  const [status, setStatus] = useState("");
  const [branchId, setBranchId] = useState("");
  const [centerId, setCenterId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/admin/branches")
      .then((r) => r.json())
      .then(setBranches);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (formType) params.set("formType", formType);
    if (status) params.set("status", status);
    if (departmentId) params.set("departmentId", departmentId);
    else if (centerId) params.set("centerId", centerId);
    else if (branchId) params.set("branchId", branchId);
    const res = await fetch(`/api/admin/card-requests?${params.toString()}`);
    setRequests(await res.json());
    setSelected(new Set());
    setLoading(false);
  }, [formType, status, branchId, centerId, departmentId]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleSelectAll() {
    if (selected.size === requests.length) setSelected(new Set());
    else setSelected(new Set(requests.map((r) => r.id)));
  }

  async function handleBulkOrder() {
    if (selected.size === 0) return;
    if (!confirm(`선택한 ${selected.size}건을 발주 처리할까요? 신청자 화면에 발주완료로 표시됩니다.`)) return;
    const res = await fetch("/api/admin/card-requests/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), status: "ORDERED" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "처리에 실패했습니다.");
      return;
    }
    load();
  }

  async function handleExport() {
    if (selected.size === 0) {
      alert("내려받을 항목을 선택하세요.");
      return;
    }
    const res = await fetch("/api/admin/card-requests/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    });
    if (!res.ok) {
      alert("다운로드에 실패했습니다.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `명찰명함신청_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectedBranch = branches.find((b) => b.id === branchId);
  const selectedCenter = selectedBranch?.centers.find((c) => c.id === centerId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">명찰 · 명함 · 유니폼 신청 취합</h1>
        <Link href="/admin/card-requests/fields" className="text-sm text-blue-600 hover:underline">
          신청 항목 관리 →
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <select
          value={formType}
          onChange={(e) => setFormType(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">전체 유형</option>
          <option value="NAMETAG">명찰</option>
          <option value="BUSINESSCARD">명함</option>
          <option value="UNIFORM">유니폼</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">전체 상태</option>
          <option value="PENDING">대기</option>
          <option value="ORDERED">발주완료</option>
        </select>
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
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <span className="text-sm text-gray-600">{selected.size}건 선택됨</span>
        <button
          onClick={handleBulkOrder}
          disabled={selected.size === 0}
          className="rounded-md border border-blue-300 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-40"
        >
          선택 항목 발주처리
        </button>
        <button
          onClick={handleExport}
          disabled={selected.size === 0}
          className="rounded-md border border-emerald-300 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
        >
          선택 항목 엑셀 다운로드
        </button>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {loading ? (
          <p className="text-sm text-gray-500">불러오는 중...</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-gray-500">조건에 맞는 신청이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-fixed text-sm" style={{ width: 942 }}>
              <colgroup>
                <col style={{ width: 32 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 70 }} />
                <col style={{ width: 70 }} />
                <col style={{ width: 80 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 260 }} />
                <col style={{ width: 60 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 80 }} />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2 pr-3">
                    <input
                      type="checkbox"
                      checked={requests.length > 0 && selected.size === requests.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="py-2 pr-3">신청일</th>
                  <th className="py-2 pr-3">유형</th>
                  <th className="py-2 pr-3">지점</th>
                  <th className="py-2 pr-3">센터</th>
                  <th className="py-2 pr-3">부서</th>
                  <th className="py-2 pr-3">내용</th>
                  <th className="py-2 pr-3">수량</th>
                  <th className="py-2 pr-3">신청자</th>
                  <th className="py-2 pr-3">상태</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const values: { label: string; value: string }[] = JSON.parse(r.values);
                  return (
                    <tr key={r.id} className="border-b border-gray-100">
                      <td className="truncate py-2 pr-3">
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={() => toggleSelect(r.id)}
                        />
                      </td>
                      <td className="truncate py-2 pr-3 whitespace-nowrap">
                        {formatDateKr(r.createdAt)}
                      </td>
                      <td className="truncate py-2 pr-3">{FORM_LABEL[r.formType]}</td>
                      <td className="truncate py-2 pr-3">{r.department.center.branch.name}</td>
                      <td className="truncate py-2 pr-3">{r.department.center.name}</td>
                      <td className="truncate py-2 pr-3">{r.department.name}</td>
                      <td className="truncate py-2 pr-3 text-xs text-gray-600">
                        {values.map((v) => `${v.label}: ${v.value}`).join(" / ")}
                      </td>
                      <td className="truncate py-2 pr-3">{r.quantity}</td>
                      <td className="truncate py-2 pr-3">{r.requester?.name}</td>
                      <td className="truncate py-2 pr-3">{STATUS_LABEL[r.status] ?? r.status}</td>
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
