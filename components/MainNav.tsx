"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "홈", exact: true },
  { href: "/admin/users", label: "사용자", adminOnly: true },
  { href: "/brands", label: "브랜드" },
  { href: "/detail-pages/new", label: "상세페이지 초안 만들기", exact: true },
  { href: "/detail-pages", label: "상세페이지 이미지", exact: true },
  { href: "/md-workspace", label: "메모리" }
];

function isActive(pathname: string, item: (typeof navItems)[number]) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function MainNav({ showAdmin }: { showAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="주요 메뉴">
      {navItems.filter((item) => !item.adminOnly || showAdmin).map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
