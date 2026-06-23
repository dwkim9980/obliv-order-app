"use client";

import { useEffect, useState, useCallback } from "react";

type Department = {
  id: string;
  name: string;
  snackEnabled: boolean;
  _count: { orders: number; users: number };
};
type Center = { id: string; name: string; address: string | null; departments: Department[] };
type Branch = { id: string; name: string; centers: Center[] };

export default function DepartmentsClient() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBranchName, setNewBranchName] = useState("");
  const [newCenterName, setNewCenterName] = useState<Record<string, string>>({});
  const [newDeptName, setNewDeptName] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/branches");
    setBranches(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addBranch(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!newBranchName) return;
    const res = await fetch("/api/admin/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newBranchName }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error);
      return;
    }
    setNewBranchName("");
    load();
  }

  async function renameBranch(b: Branch) {
    const name = prompt("새 지점명을 입력하세요.", b.name);
    if (!name || name === b.name) return;
    const res = await fetch(`/api/admin/branches/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error);
      return;
    }
    load();
  }

  async function deleteBranch(id: string) {
    if (!confirm("이 지점을 삭제할까요? 소속 센터가 있으면 삭제할 수 없습니다.")) return;
    const res = await fetch(`/api/admin/branches/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error);
      return;
    }
    load();
  }

  async function addCenter(branchId: string) {
    const name = newCenterName[branchId];
    if (!name) return;
    const res = await fetch("/api/admin/centers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, branchId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error);
      return;
    }
    setNewCenterName({ ...newCenterName, [branchId]: "" });
    load();
  }

  async function renameCenter(c: Center) {
    const name = prompt("새 센터명을 입력하세요.", c.name);
    if (!name || name === c.name) return;
    const res = await fetch(`/api/admin/centers/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error);
      return;
    }
    load();
  }

  async function editCenterAddress(c: Center) {
    const address = prompt(
      "명함에 들어갈 센터 주소를 입력하세요.",
      c.address ?? ""
    );
    if (address === null) return;
    const res = await fetch(`/api/admin/centers/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error);
      return;
    }
    load();
  }

  async function deleteCenter(id: string) {
    if (!confirm("이 센터를 삭제할까요? 소속 부서가 있으면 삭제할 수 없습니다.")) return;
    const res = await fetch(`/api/admin/centers/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error);
      return;
    }
    load();
  }

  async function addDepartment(centerId: string) {
    const name = newDeptName[centerId];
    if (!name) return;
    const res = await fetch("/api/admin/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, centerId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error);
      return;
    }
    setNewDeptName({ ...newDeptName, [centerId]: "" });
    load();
  }

  async function renameDepartment(d: Department) {
    const name = prompt("새 부서명을 입력하세요.", d.name);
    if (!name || name === d.name) return;
    const res = await fetch(`/api/admin/departments/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error);
      return;
    }
    load();
  }

  async function toggleSnack(d: Department) {
    const res = await fetch(`/api/admin/departments/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snackEnabled: !d.snackEnabled }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error);
      return;
    }
    load();
  }

  async function deleteDepartment(id: string) {
    if (!confirm("이 부서를 삭제할까요? 소속 계정/발주내역이 있으면 삭제할 수 없습니다.")) return;
    const res = await fetch(`/api/admin/departments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error);
      return;
    }
    load();
  }

  if (loading) return <p className="text-sm text-gray-500">불러오는 중...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">지점 · 센터 · 부서 관리</h1>

      <form onSubmit={addBranch} className="flex gap-2">
        <input
          placeholder="새 지점명 (예: 강남)"
          value={newBranchName}
          onChange={(e) => setNewBranchName(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white">
          지점 추가
        </button>
        {error && <p className="self-center text-sm text-red-600">{error}</p>}
      </form>

      <div className="grid gap-4 sm:grid-cols-2">
        {branches.map((b) => (
          <div key={b.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{b.name}</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => renameBranch(b)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  수정
                </button>
                <button
                  onClick={() => deleteBranch(b.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  지점 삭제
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {b.centers.map((c) => (
                <div key={c.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">{c.name}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => renameCenter(c)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => deleteCenter(c.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        센터 삭제
                      </button>
                    </div>
                  </div>
                  <p className="mb-2 text-xs text-gray-500">
                    명함 주소: {c.address || <span className="text-amber-600">미설정</span>}{" "}
                    <button
                      onClick={() => editCenterAddress(c)}
                      className="ml-1 text-blue-600 hover:underline"
                    >
                      수정
                    </button>
                  </p>

                  <ul className="mb-2 space-y-1">
                    {c.departments.map((d) => (
                      <li key={d.id} className="flex items-center justify-between text-sm">
                        <span>
                          {d.name}{" "}
                          <span className="text-gray-400">
                            (계정 {d._count.users} · 발주 {d._count.orders})
                          </span>
                        </span>
                        <span className="flex gap-2">
                          <button
                            onClick={() => toggleSnack(d)}
                            className={
                              d.snackEnabled
                                ? "text-xs text-emerald-600 hover:underline"
                                : "text-xs text-gray-400 hover:underline"
                            }
                          >
                            간식 {d.snackEnabled ? "ON" : "OFF"}
                          </button>
                          <button
                            onClick={() => renameDepartment(d)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => deleteDepartment(d.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            삭제
                          </button>
                        </span>
                      </li>
                    ))}
                    {c.departments.length === 0 && (
                      <li className="text-sm text-gray-400">등록된 부서가 없습니다.</li>
                    )}
                  </ul>

                  <div className="flex gap-2">
                    <input
                      placeholder="새 부서명"
                      value={newDeptName[c.id] ?? ""}
                      onChange={(e) => setNewDeptName({ ...newDeptName, [c.id]: e.target.value })}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    />
                    <button
                      onClick={() => addDepartment(c.id)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                    >
                      추가
                    </button>
                  </div>
                </div>
              ))}
              {b.centers.length === 0 && (
                <p className="text-sm text-gray-400">등록된 센터가 없습니다.</p>
              )}
            </div>

            <div className="mt-4 flex gap-2 border-t border-gray-100 pt-3">
              <input
                placeholder="새 센터명 (예: 피부)"
                value={newCenterName[b.id] ?? ""}
                onChange={(e) => setNewCenterName({ ...newCenterName, [b.id]: e.target.value })}
                className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              />
              <button
                onClick={() => addCenter(b.id)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                센터 추가
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
