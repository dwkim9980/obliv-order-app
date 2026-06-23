"use client";

import { useEffect, useState, useCallback } from "react";
import { useColumnLayout } from "@/lib/useColumnLayout";
import ResizableTh from "@/components/ResizableTh";

type DeptBudget = {
  departmentId: string;
  departmentName: string;
  centerName: string;
  branchName: string;
  snackEnabled: boolean;
  budgetId: string | null;
  amount: number | null;
  actualSpend: number;
  isUnset: boolean;
  overBudget: boolean;
  snackBudgetId: string | null;
  snackAmount: number | null;
  snackActualSpend: number;
  snackIsUnset: boolean;
  snackOverBudget: boolean;
};

const BUDGET_COLUMNS = [
  { id: "department", label: "부서", width: 140 },
  { id: "budget", label: "예산", width: 110, align: "right" as const },
  { id: "actual", label: "실 사용액", width: 110, align: "right" as const },
  { id: "status", label: "상태", width: 130 },
  { id: "snackBudget", label: "간식예산", width: 130 },
  { id: "snackActual", label: "간식사용액", width: 110, align: "right" as const },
];

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function BudgetsClient() {
  const [month, setMonth] = useState(currentMonth());
  const [departments, setDepartments] = useState<DeptBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedBranches, setCollapsedBranches] = useState<Set<string>>(new Set());
  const [collapsedCenters, setCollapsedCenters] = useState<Set<string>>(new Set());
  const budgetCols = useColumnLayout("admin-budgets", BUDGET_COLUMNS);

  const load = useCallback(async (m: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/budgets?month=${m}`);
    const data = await res.json();
    setDepartments(data.departments);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(month);
  }, [month, load]);

  function setMonthOf(monthIndex: number) {
    const y = Number(month.slice(0, 4));
    setMonth(`${y}-${String(monthIndex + 1).padStart(2, "0")}`);
  }

  async function handleSetBudget(departmentId: string, current: number | null, category: "GENERAL" | "SNACK") {
    const label = category === "SNACK" ? "간식 예산" : "예산";
    const input = prompt(`이번 달 ${label} 금액을 입력하세요 (원).`, current != null ? String(current) : "");
    if (input === null) return;
    const amount = Number(input);
    if (Number.isNaN(amount) || amount < 0) {
      alert("올바른 금액을 입력하세요.");
      return;
    }
    const res = await fetch("/api/admin/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departmentId, month, amount, category }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "저장에 실패했습니다.");
      return;
    }
    load(month);
  }

  async function toggleSnack(d: DeptBudget) {
    const res = await fetch(`/api/admin/departments/${d.departmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snackEnabled: !d.snackEnabled }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "처리에 실패했습니다.");
      return;
    }
    load(month);
  }

  async function handleUnset(budgetId: string) {
    if (!confirm("이 예산 설정을 해제하고 '미설정' 상태로 되돌릴까요?")) return;
    const res = await fetch(`/api/admin/budgets/${budgetId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "처리에 실패했습니다.");
      return;
    }
    load(month);
  }

  function toggleBranch(name: string) {
    const next = new Set(collapsedBranches);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setCollapsedBranches(next);
  }

  function toggleCenter(key: string) {
    const next = new Set(collapsedCenters);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setCollapsedCenters(next);
  }

  const grouped = new Map<string, Map<string, DeptBudget[]>>();
  departments.forEach((d) => {
    const centerMap = grouped.get(d.branchName) ?? new Map<string, DeptBudget[]>();
    const list = centerMap.get(d.centerName) ?? [];
    list.push(d);
    centerMap.set(d.centerName, list);
    grouped.set(d.branchName, centerMap);
  });

  const branchTotals = Array.from(grouped.entries()).map(([branchName, centerMap]) => {
    let budget = 0;
    let actual = 0;
    for (const depts of centerMap.values()) {
      for (const d of depts) {
        budget += d.amount ?? 0;
        actual += d.actualSpend;
      }
    }
    return { branchName, budget, actual };
  });

  const unsetCount = departments.filter((d) => d.isUnset).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">부서별 예산 관리</h1>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <div className="flex gap-1 text-sm">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <button
              key={m}
              onClick={() => setMonthOf(m - 1)}
              className="rounded-md border border-gray-300 px-2 py-1 hover:bg-gray-50"
            >
              {m}
            </button>
          ))}
        </div>
        {unsetCount > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            예산 미설정 {unsetCount}건
          </span>
        )}
        <button onClick={budgetCols.resetLayout} className="ml-auto text-xs text-gray-500 hover:underline">
          열 배치 초기화
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">불러오는 중...</p>
      ) : (
        <>
          {Array.from(grouped.entries()).map(([branchName, centerMap]) => {
            const branchCollapsed = collapsedBranches.has(branchName);
            let branchBudget = 0;
            let branchActual = 0;
            for (const depts of centerMap.values()) {
              for (const d of depts) {
                branchBudget += d.amount ?? 0;
                branchActual += d.actualSpend;
              }
            }
            return (
              <div key={branchName} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <button
                  onClick={() => toggleBranch(branchName)}
                  className="flex w-full items-center justify-between py-1 text-left"
                >
                  <span className="flex items-center gap-2 text-base font-bold text-gray-900">
                    <span className="text-gray-400">{branchCollapsed ? "▶" : "▼"}</span>
                    {branchName}
                  </span>
                  <span className="text-sm text-gray-600">
                    예산 {branchBudget.toLocaleString()}원 · 사용 {branchActual.toLocaleString()}원
                  </span>
                </button>
                {!branchCollapsed &&
                  Array.from(centerMap.entries()).map(([centerName, depts]) => {
                    const centerKey = `${branchName}::${centerName}`;
                    const centerCollapsed = collapsedCenters.has(centerKey);
                    const centerBudget = depts.reduce((s, d) => s + (d.amount ?? 0), 0);
                    const centerActual = depts.reduce((s, d) => s + d.actualSpend, 0);
                    return (
                      <div key={centerName} className="ml-4 mt-3">
                        <button
                          onClick={() => toggleCenter(centerKey)}
                          className="flex w-full items-center justify-between py-1 text-left"
                        >
                          <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <span className="text-gray-400">{centerCollapsed ? "▶" : "▼"}</span>
                            {centerName}
                          </span>
                          <span className="text-sm text-gray-600">
                            예산 {centerBudget.toLocaleString()}원 · 사용 {centerActual.toLocaleString()}원
                          </span>
                        </button>
                        {!centerCollapsed && (
                          <table
                            className="mt-1 table-fixed text-sm"
                            style={{ width: 150 + budgetCols.columns.reduce((s, c) => s + c.width, 0) }}
                          >
                            <colgroup>
                              {budgetCols.columns.map((c) => (
                                <col key={c.id} style={{ width: c.width }} />
                              ))}
                              <col style={{ width: 150 }} />
                            </colgroup>
                            <thead>
                              <tr className="border-b border-gray-200 text-left text-gray-500">
                                {budgetCols.columns.map((c) => (
                                  <ResizableTh
                                    key={c.id}
                                    column={c}
                                    onResizeStart={budgetCols.startResize}
                                    onDragStart={budgetCols.onDragStart}
                                    onDragOver={budgetCols.onDragOverCol}
                                    onDrop={budgetCols.onDropCol}
                                  />
                                ))}
                                <th className="py-2 pr-3"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {depts.map((d) => (
                                <tr key={d.departmentId} className="border-b border-gray-100">
                                  {budgetCols.columns.map((c) => (
                                    <td
                                      key={c.id}
                                      className={`truncate py-2 pr-3 ${c.align === "right" ? "text-right" : ""}`}
                                    >
                                      {c.id === "department" && (
                                        <span className="flex items-center gap-1.5">
                                          {d.departmentName}
                                          <button
                                            onClick={() => toggleSnack(d)}
                                            className={
                                              d.snackEnabled
                                                ? "rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 hover:bg-emerald-200"
                                                : "rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 hover:bg-gray-200"
                                            }
                                            title="간식 사용 여부 전환"
                                          >
                                            간식{d.snackEnabled ? "ON" : "OFF"}
                                          </button>
                                        </span>
                                      )}
                                      {c.id === "budget" &&
                                        (d.isUnset ? (
                                          <span className="text-gray-400">-</span>
                                        ) : (
                                          `${d.amount!.toLocaleString()}원`
                                        ))}
                                      {c.id === "actual" && `${d.actualSpend.toLocaleString()}원`}
                                      {c.id === "status" &&
                                        (d.isUnset ? (
                                          <button
                                            onClick={() => handleSetBudget(d.departmentId, d.amount, "GENERAL")}
                                            className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200"
                                          >
                                            미설정 · 클릭해서 설정
                                          </button>
                                        ) : d.overBudget ? (
                                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                            예산 초과
                                          </span>
                                        ) : (
                                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                            정상
                                          </span>
                                        ))}
                                      {c.id === "snackBudget" &&
                                        (!d.snackEnabled ? (
                                          <span className="text-gray-300">-</span>
                                        ) : d.snackIsUnset ? (
                                          <button
                                            onClick={() => handleSetBudget(d.departmentId, d.snackAmount, "SNACK")}
                                            className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200"
                                          >
                                            미설정
                                          </button>
                                        ) : (
                                          <span>
                                            {d.snackAmount!.toLocaleString()}원{" "}
                                            <button
                                              onClick={() => handleSetBudget(d.departmentId, d.snackAmount, "SNACK")}
                                              className="text-xs text-blue-600 hover:underline"
                                            >
                                              수정
                                            </button>
                                          </span>
                                        ))}
                                      {c.id === "snackActual" &&
                                        (!d.snackEnabled ? (
                                          <span className="text-gray-300">-</span>
                                        ) : (
                                          <span className={d.snackOverBudget ? "text-red-600" : ""}>
                                            {d.snackActualSpend.toLocaleString()}원
                                          </span>
                                        ))}
                                    </td>
                                  ))}
                                  <td className="truncate py-2 pr-3">
                                    <div className="flex gap-2">
                                      {!d.isUnset && (
                                        <>
                                          <button
                                            onClick={() => handleSetBudget(d.departmentId, d.amount, "GENERAL")}
                                            className="text-xs text-blue-600 hover:underline"
                                          >
                                            수정
                                          </button>
                                          <button
                                            onClick={() => handleUnset(d.budgetId!)}
                                            className="text-xs text-red-600 hover:underline"
                                          >
                                            미설정으로 되돌리기
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    );
                  })}
              </div>
            );
          })}

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">지점별 합계</h2>
            {branchTotals.length === 0 ? (
              <p className="text-sm text-gray-500">데이터가 없습니다.</p>
            ) : (
              <table className="table-fixed text-sm" style={{ width: 420 }}>
                <colgroup>
                  <col style={{ width: 160 }} />
                  <col style={{ width: 130 }} />
                  <col style={{ width: 130 }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="py-2 pr-3">지점</th>
                    <th className="py-2 pr-3 text-right">예산</th>
                    <th className="py-2 pr-3 text-right">실 사용액</th>
                  </tr>
                </thead>
                <tbody>
                  {branchTotals.map((b) => (
                    <tr key={b.branchName} className="border-b border-gray-100">
                      <td className="truncate py-2 pr-3 font-medium">{b.branchName}</td>
                      <td className="truncate py-2 pr-3 text-right">{b.budget.toLocaleString()}원</td>
                      <td className="truncate py-2 pr-3 text-right">{b.actual.toLocaleString()}원</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
