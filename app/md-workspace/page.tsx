import { saveMdWorkspaceFileAction } from "@/app/actions";
import { getCurrentUserId } from "@/lib/store";
import { readMdWorkspaceFile } from "@/lib/services/md-workspace";

export const dynamic = "force-dynamic";

const memoryHints = ["브랜드 말투", "금지 표현", "배송 안내", "반품/교환", "원하는 표현"];

export default async function MdWorkspacePage() {
  const userId = await getCurrentUserId();
  const memory = await readMdWorkspaceFile(userId);

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>메모리 관리</h1>
          <p>상세페이지를 만들 때 계속 참고할 브랜드 말투와 운영 기준을 관리합니다.</p>
        </div>
      </header>

      <section className="memoryHintBar" aria-label="메모리에 적어두면 좋은 예시">
        <strong>예시</strong>
        <div>
          {memoryHints.map((hint) => (
            <span key={hint}>{hint}</span>
          ))}
        </div>
      </section>

      <section className="panel">
        <form action={saveMdWorkspaceFileAction} data-alert="메모리를 저장합니다.">
          <div className="panelHeader">
            <div>
              <h2>{memory.title}</h2>
              <p>아래 내용은 새 상세페이지 초안을 만들 때 계속 참고하는 운영 기준입니다.</p>
            </div>
            <span className="badge">편집 가능</span>
          </div>
          <input type="hidden" name="id" value={memory.id} />
          <textarea className="editor" name="content" defaultValue={memory.content} />
          <button className="primary" type="submit" style={{ marginTop: 12 }}>
            저장
          </button>
        </form>
      </section>
    </>
  );
}
