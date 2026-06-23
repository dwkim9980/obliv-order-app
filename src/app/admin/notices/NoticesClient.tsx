"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDateTimeKr } from "@/lib/formatDate";

type Branch = { id: string; name: string; centers: { id: string; name: string }[] };
type Notice = {
  id: string;
  title: string;
  content: string;
  scope: string;
  branchId: string | null;
  centerId: string | null;
  branchName: string | null;
  centerName: string | null;
  createdAt: string;
};

const SCOPE_LABEL: Record<string, string> = {
  ALL: "전체",
  BRANCH: "지점별",
  CENTER: "센터별",
};

export default function NoticesClient() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    content: "",
    scope: "ALL",
    branchId: "",
    centerId: "",
  });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [b, n] = await Promise.all([
      fetch("/api/admin/branches").then((r) => r.json()),
      fetch("/api/admin/notices").then((r) => r.json()),
    ]);
    setBranches(b);
    setNotices(n);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const allCenters = branches.flatMap((b) =>
    b.centers.map((c) => ({ id: c.id, label: `${b.name} / ${c.name}` }))
  );

  function resetForm() {
    setForm({ title: "", content: "", scope: "ALL", branchId: "", centerId: "" });
    setEditingId(null);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.title || !form.content) {
      setError("제목과 내용을 입력하세요.");
      return;
    }
    const url = editingId ? `/api/admin/notices/${editingId}` : "/api/admin/notices";
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "처리에 실패했습니다.");
      return;
    }
    resetForm();
    load();
  }

  function handleEdit(n: Notice) {
    setEditingId(n.id);
    setForm({
      title: n.title,
      content: n.content,
      scope: n.scope,
      branchId: n.branchId ?? "",
      centerId: n.centerId ?? "",
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("이 공지를 삭제할까요?")) return;
    await fetch(`/api/admin/notices/${id}`, { method: "DELETE" });
    if (editingId === id) resetForm();
    load();
  }

  if (loading) return <p className="text-sm text-gray-500">불러오는 중...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">공지사항 관리</h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-gray-700">
          {editingId ? "공지 수정" : "새 공지 작성"}
        </h2>
        <input
          placeholder="제목"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <textarea
          placeholder="내용"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          rows={4}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={form.scope}
            onChange={(e) => setForm({ ...form, scope: e.target.value, branchId: "", centerId: "" })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="ALL">전체 공지</option>
            <option value="BRANCH">지점별 공지</option>
            <option value="CENTER">센터별 공지</option>
          </select>
          {form.scope === "BRANCH" && (
            <select
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">지점 선택</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          {form.scope === "CENTER" && (
            <select
              value={form.centerId}
              onChange={(e) => setForm({ ...form, centerId: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">센터 선택</option>
              {allCenters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            {editingId ? "수정 저장" : "등록"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              취소
            </button>
          )}
        </div>
      </form>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {notices.length === 0 ? (
          <p className="text-sm text-gray-500">등록된 공지가 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {notices.map((n) => (
              <li key={n.id} className="border-b border-gray-100 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {SCOPE_LABEL[n.scope]}
                      {n.branchName ? ` · ${n.branchName}` : ""}
                      {n.centerName ? ` · ${n.centerName}` : ""}
                    </span>
                    <span className="font-medium text-gray-900">{n.title}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(n)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{n.content}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {formatDateTimeKr(n.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
