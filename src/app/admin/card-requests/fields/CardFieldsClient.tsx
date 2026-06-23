"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type FieldDef = { id: string; label: string };

const FORM_LABEL: Record<string, string> = {
  NAMETAG: "명찰",
  BUSINESSCARD: "명함",
};

export default function CardFieldsClient() {
  const [fields, setFields] = useState<Record<string, FieldDef[]>>({});
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/card-fields");
    const data = await res.json();
    setFields(data.fields);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addField(formType: string) {
    const label = newLabel[formType];
    if (!label) return;
    const res = await fetch("/api/admin/card-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formType, label }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error);
      return;
    }
    setNewLabel({ ...newLabel, [formType]: "" });
    load();
  }

  async function renameField(f: FieldDef) {
    const label = prompt("새 항목명을 입력하세요.", f.label);
    if (!label || label === f.label) return;
    await fetch(`/api/admin/card-fields/${f.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    load();
  }

  async function deleteField(id: string) {
    if (!confirm("이 항목을 삭제할까요? 기존 신청 기록은 그대로 유지되고, 새 신청서에서만 사라집니다.")) return;
    await fetch(`/api/admin/card-fields/${id}`, { method: "DELETE" });
    load();
  }

  if (loading) return <p className="text-sm text-gray-500">불러오는 중...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">명찰 · 명함 · 유니폼 신청 항목 관리</h1>
        <Link href="/admin/card-requests" className="text-sm text-blue-600 hover:underline">
          ← 신청 취합으로
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(FORM_LABEL).map(([formType, label]) => (
          <div key={formType} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-bold text-gray-900">{label} 신청서 항목</h2>
            <ul className="mb-3 space-y-1">
              {(fields[formType] ?? []).map((f) => (
                <li key={f.id} className="flex items-center justify-between text-sm">
                  <span>{f.label}</span>
                  <span className="flex gap-2">
                    <button
                      onClick={() => renameField(f)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => deleteField(f.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      삭제
                    </button>
                  </span>
                </li>
              ))}
              {(fields[formType] ?? []).length === 0 && (
                <li className="text-sm text-gray-400">등록된 항목이 없습니다.</li>
              )}
            </ul>
            <div className="flex gap-2">
              <input
                placeholder="새 항목명 (예: 부서명)"
                value={newLabel[formType] ?? ""}
                onChange={(e) => setNewLabel({ ...newLabel, [formType]: e.target.value })}
                className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              />
              <button
                onClick={() => addField(formType)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                추가
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
