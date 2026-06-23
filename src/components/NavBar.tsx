"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({
  href,
  active,
  highlight,
  children,
}: {
  href: string;
  active: boolean;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  const className = active
    ? "font-bold text-black"
    : highlight
      ? "font-semibold text-red-600 hover:text-red-700"
      : "text-gray-600 hover:text-gray-900";
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export default function NavBar({
  name,
  role,
  branchName,
  centerName,
  departmentName,
}: {
  name: string;
  role: string;
  branchName?: string | null;
  centerName?: string | null;
  departmentName?: string | null;
}) {
  const pathname = usePathname();
  const [pendingCardRequests, setPendingCardRequests] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);

  useEffect(() => {
    if (role !== "ADMIN") return;
    let cancelled = false;
    const check = () => {
      fetch("/api/admin/card-requests/pending-count")
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled) setPendingCardRequests(data.count ?? 0);
        })
        .catch(() => {});
      fetch("/api/orders/pending-count")
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled) setPendingOrders(data.count ?? 0);
        })
        .catch(() => {});
    };
    check();
    const interval = setInterval(check, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [role]);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <header className="no-print flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center gap-4">
        <Link href={role === "ADMIN" ? "/admin" : "/orders"} className="font-bold text-gray-900">
          Obliv 발주프로그램
        </Link>
        {role === "ADMIN" ? (
          <nav className="flex gap-3 text-sm">
            <NavLink href="/admin/notices" active={isActive("/admin/notices")}>공지사항</NavLink>
            <NavLink href="/admin" active={pathname === "/admin"}>대시보드</NavLink>
            <NavLink
              href="/admin/orders"
              active={isActive("/admin/orders")}
              highlight={pendingOrders > 0}
            >
              전체 발주내역{pendingOrders > 0 ? ` (${pendingOrders})` : ""}
            </NavLink>
            <NavLink href="/admin/search" active={isActive("/admin/search")}>검색</NavLink>
            <NavLink
              href="/admin/card-requests"
              active={isActive("/admin/card-requests")}
              highlight={pendingCardRequests > 0}
            >
              명찰·명함·유니폼 신청{pendingCardRequests > 0 ? ` (${pendingCardRequests})` : ""}
            </NavLink>
            <NavLink href="/admin/budgets" active={isActive("/admin/budgets")}>예산 관리</NavLink>
            <NavLink href="/admin/departments" active={isActive("/admin/departments")}>지점·센터·부서 관리</NavLink>
            <NavLink href="/admin/users" active={isActive("/admin/users")}>계정 관리</NavLink>
          </nav>
        ) : (
          <nav className="flex gap-3 text-sm">
            <NavLink href="/orders" active={pathname === "/orders"}>내 부서 발주</NavLink>
            <NavLink href="/orders/history" active={isActive("/orders/history")}>주문내역</NavLink>
            <NavLink href="/requests" active={isActive("/requests")}>명찰·명함·유니폼 신청</NavLink>
          </nav>
        )}
      </div>
      <div className="flex items-center gap-3 text-sm text-gray-600">
        <span>
          {branchName ? `${branchName} ` : ""}
          {centerName ? `${centerName} ` : ""}
          {departmentName ? `${departmentName} ` : ""}
          {name}님
        </span>
        <Link href="/account" className="hover:text-gray-900">비밀번호 변경</Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-md border border-gray-300 px-3 py-1 hover:bg-gray-50"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
