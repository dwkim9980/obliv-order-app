"use client";

import { useEffect, useState, useCallback } from "react";

type Department = { id: string; name: string };
type Center = { id: string; name: string; departments: Department[] };
type Branch = { id: string; name: string; centers: Center[] };
type User = {
  id: string;
  username: string;
  name: string;
  role: string;
  departmentId: string | null;
  department: { name: string; center: { name: string; branch: { name: string } } } | null;
};

export default function UsersClient() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    username: "",
    password: "",
    name: "",
    role: "DEPARTMENT",
    departmentId: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [b, u] = await Promise.all([
      fetch("/api/admin/branches").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
    ]);
    setBranches(b);
    setUsers(u);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "생성에 실패했습니다.");
      return;
    }
    setForm({ username: "", password: "", name: "", role: "DEPARTMENT", departmentId: "" });
    load();
  }

  async function handleResetPassword(id: string) {
    const newPassword = prompt("새 비밀번호를 입력하세요.");
    if (!newPassword) return;
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    alert("비밀번호가 변경되었습니다.");
  }

  async function handleDelete(id: string) {
    if (!confirm("이 계정을 삭제할까요?")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error);
      return;
    }
    load();
  }

  const allDepartments = branches.flatMap((b) =>
    b.centers.flatMap((c) =>
      c.departments.map((d) => ({ id: d.id, label: `${b.name} / ${c.name} / ${d.name}` }))
    )
  );

  if (loading) return <p className="text-sm text-gray-500">불러오는 중...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">계정 관리</h1>

      <form
        onSubmit={handleCreate}
        className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-6"
      >
        <input
          placeholder="아이디"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="비밀번호"
          type="text"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="이름"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="DEPARTMENT">부서 계정</option>
          <option value="ADMIN">관리자</option>
        </select>
        <select
          value={form.departmentId}
          onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          disabled={form.role !== "DEPARTMENT"}
        >
          <option value="">부서 선택</option>
          {allDepartments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white">
          계정 생성
        </button>
        {error && <p className="sm:col-span-6 text-sm text-red-600">{error}</p>}
      </form>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <table className="table-fixed text-sm" style={{ width: 780 }}>
          <colgroup>
            <col style={{ width: 180 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 80 }} />
            <col style={{ width: 220 }} />
            <col style={{ width: 160 }} />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2 pr-3">아이디</th>
              <th className="py-2 pr-3">이름</th>
              <th className="py-2 pr-3">권한</th>
              <th className="py-2 pr-3">소속</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-100">
                <td className="truncate py-2 pr-3">{u.username}</td>
                <td className="truncate py-2 pr-3">{u.name}</td>
                <td className="truncate py-2 pr-3">{u.role === "ADMIN" ? "관리자" : "부서"}</td>
                <td className="truncate py-2 pr-3">
                  {u.department
                    ? `${u.department.center.branch.name} / ${u.department.center.name} / ${u.department.name}`
                    : "-"}
                </td>
                <td className="py-2 pr-3 flex gap-2">
                  <button
                    onClick={() => handleResetPassword(u.id)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    비밀번호 초기화
                  </button>
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
