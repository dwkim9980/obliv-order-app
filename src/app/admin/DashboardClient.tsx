"use client";

import { useEffect, useState, useCallback } from "react";
import { useColumnLayout } from "@/lib/useColumnLayout";
import ResizableTh from "@/components/ResizableTh";

type DeptStat = {
  departmentId: string;
  departmentName: string;
  centerName: string;
  branchName: string;
  count: number;
  totalAmount: number;
  snackCount: number;
  snackAmount: number;
};

type RowMetrics = {
  totalCount: number;
  totalAmount: number;
  generalCount: number;
  generalAmount: number;
  snackCount: number;
  snackAmount: number;
};

function emptyMetrics(): RowMetrics {
  return { totalCount: 0, totalAmount: 0, generalCount: 0, generalAmount: 0, snackCount: 0, snackAmount: 0 };
}

function addMetrics(target: RowMetrics, d: DeptStat) {
  target.generalCount += d.count;
  target.generalAmount += d.totalAmount;
  target.snackCount += d.snackCount;
  target.snackAmount += d.snackAmount;
  target.totalCount += d.count + d.snackCount;
  target.totalAmount += d.totalAmount + d.snackAmount;
}

const METRIC_COLUMNS = [
  { id: "name", label: "이름", width: 140 },
  { id: "totalCount", label: "총건수", width: 80, align: "right" as const },
  { id: "totalAmount", label: "총금액", width: 110, align: "right" as const },
  { id: "generalCount", label: "일반발주건수", width: 110, align: "right" as const },
  { id: "generalAmount", label: "일반발주금액", width: 110, align: "right" as const },
  { id: "snackCount", label: "간식건수", width: 80, align: "right" as const },
  { id: "snackAmount", label: "간식금액", width: 110, align: "right" as const },
];

function renderMetricCell(colId: string, name: string, m: RowMetrics) {
  switch (colId) {
    case "name":
      return name;
    case "totalCount":
      return `${m.totalCount}건`;
    case "totalAmount":
      return `${m.totalAmount.toLocaleString()}원`;
    case "generalCount":
      return `${m.generalCount}건`;
    case "generalAmount":
      return `${m.generalAmount.toLocaleString()}원`;
    case "snackCount":
      return `${m.snackCount}건`;
    case "snackAmount":
      return `${m.snackAmount.toLocaleString()}원`;
    default:
      return null;
  }
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthStart() {
  const d = new Date();
  return formatDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

function todayStr() {
  return formatDate(new Date());
}

export default function DashboardClient() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());
  const [data, setData] = useState<{
    totalAmount: number;
    totalCount: number;
    snackTotalAmount: number;
    snackTotalCount: number;
    byDepartment: DeptStat[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsedBranches, setCollapsedBranches] = useState<Set<string>>(new Set());
  const [collapsedCenters, setCollapsedCenters] = useState<Set<string>>(new Set());

  const deptCols = useColumnLayout("dashboard-dept", METRIC_COLUMNS);
  const branchCols = useColumnLayout("dashboard-branch-totals", METRIC_COLUMNS);

  const load = useCallback(async (f: string, t: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (f) params.set("from", f);
    if (t) params.set("to", t);
    const res = await fetch(`/api/admin/stats?${params.toString()}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(from, to);
  }, [from, to, load]);

  function setPreset(preset: "thisMonth" | "lastMonth" | "thisYear") {
    const now = new Date();
    if (preset === "thisMonth") {
      setFrom(formatDate(new Date(now.getFullYear(), now.getMonth(), 1)));
      setTo(todayStr());
    } else if (preset === "lastMonth") {
      setFrom(formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
      setTo(formatDate(new Date(now.getFullYear(), now.getMonth(), 0)));
    } else if (preset === "thisYear") {
      setFrom(formatDate(new Date(now.getFullYear(), 0, 1)));
      setTo(todayStr());
    }
  }

  function setMonthOf(monthIndex: number) {
    const year = Number((from || to || todayStr()).slice(0, 4));
    setFrom(formatDate(new Date(year, monthIndex, 1)));
    setTo(formatDate(new Date(year, monthIndex + 1, 0)));
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

  // 지점 > 센터 > 부서 3단계로 그룹화
  const byBranch = new Map<string, Map<string, DeptStat[]>>();
  data?.byDepartment.forEach((d) => {
    const centerMap = byBranch.get(d.branchName) ?? new Map<string, DeptStat[]>();
    const list = centerMap.get(d.centerName) ?? [];
    list.push(d);
    centerMap.set(d.centerName, list);
    byBranch.set(d.branchName, centerMap);
  });

  const branchTotals = Array.from(byBranch.entries()).map(([branchName, centerMap]) => {
    const m = emptyMetrics();
    for (const depts of centerMap.values()) {
      for (const d of depts) addMetrics(m, d);
    }
    return { branchName, metrics: m };
  });

  const grandTotal = emptyMetrics();
  data?.byDepartment.forEach((d) => addMetrics(grandTotal, d));

  function expandAll() {
    setCollapsedBranches(new Set());
    setCollapsedCenters(new Set());
  }

  function collapseAll() {
    const allBranches = new Set(byBranch.keys());
    const allCenters = new Set<string>();
    byBranch.forEach((centerMap, branchName) => {
      centerMap.forEach((_depts, centerName) => {
        allCenters.add(`${branchName}::${centerName}`);
      });
    });
    setCollapsedBranches(allBranches);
    setCollapsedCenters(allCenters);
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">관리자 대시보드</h1>
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
        <div className="flex gap-1 text-sm">
          <button
            onClick={() => setPreset("thisMonth")}
            className="rounded-md border border-gray-300 px-2 py-1 hover:bg-gray-50"
          >
            이번 달
          </button>
          <button
            onClick={() => setPreset("lastMonth")}
            className="rounded-md border border-gray-300 px-2 py-1 hover:bg-gray-50"
          >
            지난 달
          </button>
          <button
            onClick={() => setPreset("thisYear")}
            className="rounded-md border border-gray-300 px-2 py-1 hover:bg-gray-50"
          >
            올해
          </button>
        </div>
        <a
          href={`/api/admin/export?from=${from}&to=${to}`}
          className="ml-auto rounded-md border border-emerald-300 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50"
        >
          엑셀 다운로드 (이 기간)
        </a>
        <button
          onClick={() => window.print()}
          className="rounded-md border border-gray-400 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          🖨 A4 출력
        </button>
      </div>

      <h1 className="hidden print:block text-xl font-bold text-gray-900">
        관리자 대시보드 ({from} ~ {to})
      </h1>

      {loading || !data ? (
        <p className="text-sm text-gray-500">불러오는 중...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">기간내 총 발주건수</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{grandTotal.totalCount}건</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">기간 내 총 구매 금액</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {grandTotal.totalAmount.toLocaleString()}원
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">지점별 합계</h2>
              <button onClick={branchCols.resetLayout} className="text-xs text-gray-500 hover:underline">
                열 배치 초기화
              </button>
            </div>
            {branchTotals.length === 0 ? (
              <p className="text-sm text-gray-500">데이터가 없습니다.</p>
            ) : (
              <table
                className="table-fixed text-sm"
                style={{ width: branchCols.columns.reduce((s, c) => s + c.width, 0) }}
              >
                <colgroup>
                  {branchCols.columns.map((c) => (
                    <col key={c.id} style={{ width: c.width }} />
                  ))}
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    {branchCols.columns.map((c) =>
                      c.id === "name" ? (
                        <ResizableTh
                          key={c.id}
                          column={{ ...c, label: "지점" }}
                          onResizeStart={branchCols.startResize}
                          onDragStart={branchCols.onDragStart}
                          onDragOver={branchCols.onDragOverCol}
                          onDrop={branchCols.onDropCol}
                        />
                      ) : (
                        <ResizableTh
                          key={c.id}
                          column={c}
                          onResizeStart={branchCols.startResize}
                          onDragStart={branchCols.onDragStart}
                          onDragOver={branchCols.onDragOverCol}
                          onDrop={branchCols.onDropCol}
                        />
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {branchTotals.map((b) => (
                    <tr key={b.branchName} className="border-b border-gray-100">
                      {branchCols.columns.map((c) => (
                        <td
                          key={c.id}
                          className={`truncate py-2 pr-3 ${c.align === "right" ? "text-right" : ""} ${c.id === "name" ? "font-medium" : ""}`}
                        >
                          {renderMetricCell(c.id, b.branchName, b.metrics)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-300 font-semibold text-gray-900">
                    {branchCols.columns.map((c) => (
                      <td key={c.id} className={`truncate py-2 pr-3 ${c.align === "right" ? "text-right" : ""}`}>
                        {renderMetricCell(c.id, "합계", grandTotal)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">지점·센터·부서별 현황</h2>
              <div className="flex gap-2 text-xs">
                <button onClick={expandAll} className="text-blue-600 hover:underline">
                  전체 펼치기
                </button>
                <button onClick={collapseAll} className="text-blue-600 hover:underline">
                  전체 접기
                </button>
                <button onClick={deptCols.resetLayout} className="text-gray-500 hover:underline">
                  열 배치 초기화
                </button>
              </div>
            </div>
            {data.byDepartment.length === 0 ? (
              <p className="text-sm text-gray-500">해당 기간 발주 내역이 없습니다.</p>
            ) : (
              Array.from(byBranch.entries()).map(([branchName, centerMap]) => {
                const branchCollapsed = collapsedBranches.has(branchName);
                const branchMetrics = emptyMetrics();
                for (const depts of centerMap.values()) {
                  for (const d of depts) addMetrics(branchMetrics, d);
                }
                return (
                  <div key={branchName} className="mb-3 border-b border-gray-100 pb-3">
                    <button
                      onClick={() => toggleBranch(branchName)}
                      className="flex w-full items-center justify-between py-1 text-left"
                    >
                      <span className="flex items-center gap-2 text-base font-bold text-gray-900">
                        <span className="text-gray-400">{branchCollapsed ? "▶" : "▼"}</span>
                        {branchName}
                      </span>
                      <span className="text-sm text-gray-600">
                        {branchMetrics.totalCount}건 · {branchMetrics.totalAmount.toLocaleString()}원
                      </span>
                    </button>
                    {!branchCollapsed &&
                      Array.from(centerMap.entries()).map(([centerName, depts]) => {
                        const centerKey = `${branchName}::${centerName}`;
                        const centerCollapsed = collapsedCenters.has(centerKey);
                        const centerMetrics = emptyMetrics();
                        for (const d of depts) addMetrics(centerMetrics, d);
                        return (
                          <div key={centerName} className="ml-4 mt-2">
                            <button
                              onClick={() => toggleCenter(centerKey)}
                              className="flex w-full items-center justify-between py-1 text-left"
                            >
                              <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                <span className="text-gray-400">{centerCollapsed ? "▶" : "▼"}</span>
                                {centerName}
                              </span>
                              <span className="text-sm text-gray-600">
                                {centerMetrics.totalCount}건 · {centerMetrics.totalAmount.toLocaleString()}원
                              </span>
                            </button>
                            {!centerCollapsed && (
                              <table
                                className="mt-1 table-fixed text-sm"
                                style={{ width: deptCols.columns.reduce((s, c) => s + c.width, 0) }}
                              >
                                <colgroup>
                                  {deptCols.columns.map((c) => (
                                    <col key={c.id} style={{ width: c.width }} />
                                  ))}
                                </colgroup>
                                <thead>
                                  <tr className="border-b border-gray-200 text-left text-gray-500">
                                    {deptCols.columns.map((c) =>
                                      c.id === "name" ? (
                                        <ResizableTh
                                          key={c.id}
                                          column={{ ...c, label: "부서" }}
                                          onResizeStart={deptCols.startResize}
                                          onDragStart={deptCols.onDragStart}
                                          onDragOver={deptCols.onDragOverCol}
                                          onDrop={deptCols.onDropCol}
                                        />
                                      ) : (
                                        <ResizableTh
                                          key={c.id}
                                          column={c}
                                          onResizeStart={deptCols.startResize}
                                          onDragStart={deptCols.onDragStart}
                                          onDragOver={deptCols.onDragOverCol}
                                          onDrop={deptCols.onDropCol}
                                        />
                                      )
                                    )}
                                  </tr>
                                </thead>
                                <tbody>
                                  {depts.map((d) => {
                                    const m = emptyMetrics();
                                    addMetrics(m, d);
                                    return (
                                      <tr key={d.departmentId} className="border-b border-gray-100">
                                        {deptCols.columns.map((c) => (
                                          <td
                                            key={c.id}
                                            className={`truncate py-2 pr-3 ${c.align === "right" ? "text-right" : ""}`}
                                          >
                                            {renderMetricCell(c.id, d.departmentName, m)}
                                          </td>
                                        ))}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        );
                      })}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
