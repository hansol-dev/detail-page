import { redirect } from "next/navigation";
import { createUserAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/store";
import { listUsers } from "@/lib/services/users";

export const dynamic = "force-dynamic";

function roleLabel(role: string) {
  return role === "admin" ? "관리자" : "사용자";
}

function statusLabel(status: string) {
  return status === "active" ? "활성" : "비활성";
}

export default async function AdminUsersPage() {
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== "admin") redirect("/");

  const users = await listUsers();

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>사용자 관리</h1>
          <p>MVP에서는 운영자가 사용자 계정을 직접 추가합니다. 새 사용자의 기본 비밀번호는 1234입니다.</p>
        </div>
      </header>

      <section className="grid two">
        <form className="panel formGrid" action={createUserAction} data-alert="사용자 계정을 추가합니다.">
          <h2 className="full">사용자 추가</h2>
          <label>
            <span className="labelLine">
              <span>아이디</span>
              <span className="badge">필수</span>
            </span>
            <input name="email" type="text" required placeholder="lec" autoComplete="username" />
          </label>
          <label>
            <span className="labelLine">
              <span>표시 이름</span>
              <span className="badge">필수</span>
            </span>
            <input name="displayName" required placeholder="Demo Seller" />
          </label>
          <label>
            <span className="labelLine">
              <span>역할</span>
              <span className="badge">필수</span>
            </span>
            <select name="role" defaultValue="user">
              <option value="user">사용자</option>
              <option value="admin">관리자</option>
            </select>
          </label>
          <div className="full">
            <button className="primary" type="submit">
              사용자 생성
            </button>
          </div>
        </form>

        <section className="panel">
          <h2>등록 사용자</h2>
          <div className="tableWrap">
            <table className="table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>아이디</th>
                  <th>표시 이름</th>
                  <th>역할</th>
                  <th>상태</th>
                  <th>기본 비밀번호</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.displayName}</td>
                    <td>{roleLabel(user.role)}</td>
                    <td>{statusLabel(user.status)}</td>
                    <td>1234</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </>
  );
}
