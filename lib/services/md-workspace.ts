import "server-only";
import { createId, readDb, timestamp, updateDb } from "../store";
import type { MdWorkspaceFile, UserMemoryDocument } from "../types";

const MEMORY_TITLE = "운영 메모리";
const MEMORY_TEMPLATE = `# 운영 메모리

상세페이지를 만들 때 공통으로 참고할 내용을 적어두세요.

## 자주 쓰는 안내

- 

## 브랜드 운영 원칙

- 

## 생성할 때 주의할 점

- 
`;

async function getOrCreateMemoryDocument(userId: string): Promise<UserMemoryDocument> {
  const db = await readDb();
  const existing = db.userMemoryDocuments.find((doc) => doc.userId === userId);
  if (existing) {
    const looksLikeBrokenSeed =
      existing.title !== MEMORY_TITLE &&
      (existing.content.includes("釉") || existing.content.includes("硫") || existing.content.includes("?댁"));
    if (existing.title !== MEMORY_TITLE || looksLikeBrokenSeed) {
      return updateDb<UserMemoryDocument>((nextDb) => {
        const target = nextDb.userMemoryDocuments.find((doc) => doc.id === existing.id && doc.userId === userId);
        if (!target) return existing;
        target.title = MEMORY_TITLE;
        if (looksLikeBrokenSeed) target.content = MEMORY_TEMPLATE;
        target.updatedAt = timestamp();
        return target;
      });
    }
    return existing;
  }

  return updateDb<UserMemoryDocument>((nextDb) => {
    const again = nextDb.userMemoryDocuments.find((doc) => doc.userId === userId);
    if (again) return again;

    const ts = timestamp();
    const doc: UserMemoryDocument = {
      id: createId("memory"),
      userId,
      title: MEMORY_TITLE,
      content: MEMORY_TEMPLATE,
      createdAt: ts,
      updatedAt: ts
    };
    nextDb.userMemoryDocuments.push(doc);
    return doc;
  });
}

export async function listMdWorkspaceFiles(userId: string): Promise<MdWorkspaceFile[]> {
  const doc = await getOrCreateMemoryDocument(userId);
  return [
    {
      id: `db:memory:${doc.id}`,
      title: doc.title || MEMORY_TITLE,
      source: "db",
      editable: true,
      updatedAt: doc.updatedAt
    }
  ];
}

export async function readMdWorkspaceFile(userId: string, id?: string) {
  const doc = await getOrCreateMemoryDocument(userId);
  const expectedId = `db:memory:${doc.id}`;
  if (id && id !== expectedId) throw new Error("메모리를 찾을 수 없습니다.");
  return {
    id: expectedId,
    title: doc.title || MEMORY_TITLE,
    content: doc.content,
    editable: true
  };
}

export async function saveMdWorkspaceFile(userId: string, id: string, content: string) {
  const doc = await getOrCreateMemoryDocument(userId);
  const expectedId = `db:memory:${doc.id}`;
  if (id !== expectedId) throw new Error("저장할 메모리를 찾을 수 없습니다.");

  return updateDb<UserMemoryDocument>((db) => {
    const target = db.userMemoryDocuments.find((item) => item.id === doc.id && item.userId === userId);
    if (!target) throw new Error("저장할 메모리를 찾을 수 없습니다.");
    target.title = target.title || MEMORY_TITLE;
    target.content = content;
    target.updatedAt = timestamp();
    return target;
  });
}
