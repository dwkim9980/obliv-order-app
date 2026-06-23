"use client";

import { useRef, useState } from "react";

export type Attachment = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export default function AttachmentList({
  orderId,
  attachments,
  onChange,
  canUpload = true,
  canDelete = true,
}: {
  orderId: string;
  attachments: Attachment[];
  onChange: () => void;
  canUpload?: boolean;
  canDelete?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/orders/${orderId}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "업로드에 실패했습니다.");
        return;
      }
      onChange();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 첨부파일을 삭제할까요?")) return;
    const res = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "삭제에 실패했습니다.");
      return;
    }
    onChange();
  }

  return (
    <div className="space-y-1">
      {attachments.length > 0 && (
        <ul className="space-y-0.5">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center gap-2 text-xs">
              <a
                href={`/api/attachments/${a.id}`}
                className="truncate text-blue-600 underline"
                title={a.originalName}
              >
                {a.originalName}
              </a>
              <span className="text-gray-400">({Math.round(a.size / 1024)}KB)</span>
              {canDelete && (
                <button
                  onClick={() => handleDelete(a.id)}
                  className="text-red-500 hover:underline"
                >
                  삭제
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canUpload && (
        <label className="inline-block cursor-pointer text-xs text-gray-500 hover:underline">
          {uploading ? "업로드 중..." : "+ 파일 첨부"}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            disabled={uploading}
            onChange={handleFileChange}
          />
        </label>
      )}
    </div>
  );
}
