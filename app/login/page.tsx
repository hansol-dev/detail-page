import { loginAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <section className="loginPage">
      <form className="panel loginPanel" action={loginAction} data-action-feedback="off">
        <div className="loginBrand">
          <span className="brandMark">D</span>
          <div>
            <strong>상세페이지 도구</strong>
            <small>브랜드 기본값으로 상세페이지 초안과 이미지를 만듭니다</small>
          </div>
        </div>
        <div>
          <h1>로그인</h1>
          <p>등록된 사용자 아이디와 비밀번호로 접속하세요.</p>
        </div>
        {error ? <p className="danger">아이디 또는 비밀번호가 올바르지 않습니다.</p> : null}
        <label>
          <span className="labelLine">
            <span>아이디</span>
            <span className="badge">필수</span>
          </span>
          <input name="email" type="text" required placeholder="lec" autoComplete="username" />
        </label>
        <label>
          <span className="labelLine">
            <span>비밀번호</span>
            <span className="badge">필수</span>
          </span>
          <input name="password" type="password" required placeholder="1234" autoComplete="current-password" />
        </label>
        <button className="primary" type="submit">
          로그인
        </button>
      </form>
    </section>
  );
}
