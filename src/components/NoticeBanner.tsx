"use client";

import { useEffect, useState } from "react";
import { formatDateKr } from "@/lib/formatDate";

type Notice = {
  id: string;
  title: string;
  content: string;
  scope: string;
  createdAt: string;
};

export default function NoticeBanner() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/notices")
      .then((r) => r.json())
      .then(setNotices)
      .catch(() => {});
  }, []);

  if (notices.length === 0) return null;

  function toggle(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  }

  return (
    <section className="space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <h2 className="text-sm font-semibold text-blue-900">📢 공지사항</h2>
      <ul className="space-y-1.5">
        {notices.map((n) => (
          <li key={n.id} className="text-sm">
            <button
              onClick={() => toggle(n.id)}
              className="text-left font-medium text-blue-800 hover:underline"
            >
              {n.title}
              <span className="ml-2 text-xs text-blue-500">
                {formatDateKr(n.createdAt)}
              </span>
            </button>
            {expanded.has(n.id) && (
              <p className="mt-1 whitespace-pre-wrap text-xs text-blue-700">{n.content}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
