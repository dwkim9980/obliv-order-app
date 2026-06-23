"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDateKr } from "@/lib/formatDate";

type FieldDef = { id: string; label: string };
type FieldsResponse = { fields: Record<string, FieldDef[]>; centerAddress: string | null };

type CardRequest = {
  id: string;
  formType: string;
  quantity: number;
  values: string;
  centerAddress: string | null;
  status: string;
  createdAt: string;
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

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  ORDERED: "bg-green-100 text-green-700",
};

export default function RequestsClient() {
  const [formType, setFormType] = useState<"NAMETAG" | "BUSINESSCARD" | "UNIFORM">("NAMETAG");
  const [fieldsData, setFieldsData] = useState<FieldsResponse | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState("1");
  const [requests, setRequests] = useState<CardRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFields = useCallback(async () => {
    const res = await fetch("/api/card-fields");
    setFieldsData(await res.json());
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/card-requests");
    setRequests(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFields();
    loadRequests();
  }, [loadFields, loadRequests]);

  useEffect(() => {
    setValues({});
    setQuantity("1");
  }, [formType]);

  const currentFields = fieldsData?.fields[formType] ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const missing = currentFields.filter((f) => !values[f.id]?.trim());
    if (missing.length > 0) {
      setError(`다음 항목을 입력하세요: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }
    const payload = {
      formType,
      quantity,
      values: currentFields.map((f) => ({ label: f.label, value: values[f.id] })),
    };
    const res = await fetch("/api/card-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "신청에 실패했습니다. 잠시 후 다시 시도하거나 다시 로그인해주세요.");
      return;
    }
    setValues({});
    setQuantity("1");
    loadRequests();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">명찰 / 명함 / 유니폼 신청</h2>

        <div className="mb-4 flex gap-2">
          {(["NAMETAG", "BUSINESSCARD", "UNIFORM"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFormType(t)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium ${
                formType === t
                  ? "bg-gray-900 text-white"
                  : "border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {FORM_LABEL[t]}
            </button>
          ))}
        </div>

        {!fieldsData ? (
          <p className="text-sm text-gray-500">불러오는 중...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {currentFields.map((f) => (
                <div key={f.id}>
                  <label className="block text-sm font-medium text-gray-700">{f.label}</label>
                  {f.label === "성별" ? (
                    <select
                      value={values[f.id] ?? ""}
                      onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">선택</option>
                      <option value="남">남</option>
                      <option value="여">여</option>
                    </select>
                  ) : (
                    <input
                      value={values[f.id] ?? ""}
                      onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  )}
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700">수량(인쇄 부수)</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {formType === "BUSINESSCARD" && (
              <div className="space-y-1">
                <p className="text-sm text-gray-500">
                  명함에 들어갈 주소:{" "}
                  {fieldsData.centerAddress || (
                    <span className="text-amber-600">
                      아직 설정되지 않았습니다. 관리자에게 문의하세요.
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400">1통 주문시 200매 입니다.</p>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
            >
              신청하기
            </button>
          </form>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">내 신청내역</h2>
        {loading ? (
          <p className="text-sm text-gray-500">불러오는 중...</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-gray-500">신청 내역이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col style={{ width: "13%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "44%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "11%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2 pr-3">신청일</th>
                  <th className="py-2 pr-3">유형</th>
                  <th className="py-2 pr-3">내용</th>
                  <th className="py-2 pr-3">수량</th>
                  <th className="py-2 pr-3">신청자</th>
                  <th className="py-2 pr-3">상태</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const parsedValues: { label: string; value: string }[] = JSON.parse(r.values);
                  return (
                    <tr key={r.id} className="border-b border-gray-100">
                      <td className="truncate py-2 pr-3 whitespace-nowrap">
                        {formatDateKr(r.createdAt)}
                      </td>
                      <td className="truncate py-2 pr-3">{FORM_LABEL[r.formType]}</td>
                      <td className="truncate py-2 pr-3 text-xs text-gray-600">
                        {parsedValues.map((v) => `${v.label}: ${v.value}`).join(" / ")}
                      </td>
                      <td className="truncate py-2 pr-3">{r.quantity}</td>
                      <td className="truncate py-2 pr-3">{r.requester?.name}</td>
                      <td className="truncate py-2 pr-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[r.status]}`}
                        >
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
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
