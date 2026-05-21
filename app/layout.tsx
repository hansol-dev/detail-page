import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { ActionFeedback } from "@/components/ActionFeedback";
import { MainNav } from "@/components/MainNav";
import { getCurrentUser } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "상세페이지 생성 도구",
  description: "브랜드 기본값으로 만드는 상세페이지 생성 도구"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isLoginPage = pathname === "/login" || pathname.startsWith("/login/");
  const currentUser = isLoginPage ? null : await getCurrentUser();
  const showAdmin = currentUser?.role === "admin";

  return (
    <html lang="ko">
      <body>
        {isLoginPage ? (
          <main className="main authMain">{children}</main>
        ) : (
          <div className="shell">
            <header className="sidebar">
              <Link className="brand" href="/">
                <span className="brandMark">D</span>
                <span>
                  <strong>상세페이지 도구</strong>
                  <small>브랜드와 상품을 연결해요</small>
                </span>
              </Link>
              {currentUser ? (
                <div className="currentUserBox">
                  <strong>{currentUser.displayName}</strong>
                  <span>{currentUser.email}</span>
                </div>
              ) : null}
              {currentUser ? <MainNav showAdmin={showAdmin} /> : null}
              {currentUser ? (
                <form action={logoutAction} className="logoutForm" data-alert="로그아웃합니다.">
                  <button type="submit">로그아웃</button>
                </form>
              ) : null}
            </header>
            <main className="main">{children}</main>
          </div>
        )}
        <ActionFeedback />
      </body>
    </html>
  );
}
