import "server-only";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { cookies } from "next/headers";
import type { AppDb, Asset, AssetKind } from "./types";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, ".data");
const STORAGE_DIR = path.join(DATA_DIR, "assets");
const DB_PATH = path.join(DATA_DIR, "detail-page-web-tool.json");

function now() {
  return new Date().toISOString();
}

function initialDb(): AppDb {
  const ts = now();
  const adminId = "admin-demo";
  const userId = "user-demo";

  return {
    users: [
      {
        id: adminId,
        email: "admin@example.com",
        displayName: "Admin",
        password: "1234",
        role: "admin",
        status: "active",
        createdAt: ts,
        updatedAt: ts
      },
      {
        id: userId,
        email: "seller@example.com",
        displayName: "Demo Seller",
        password: "1234",
        role: "user",
        status: "active",
        createdAt: ts,
        updatedAt: ts
      }
    ],
    brands: [],
    productDrafts: [],
    approvalMarkdownVersions: [],
    imageGenerationJobs: [],
    generatedCuts: [],
    assets: [],
    userMemoryDocuments: [
      {
        id: "memory-demo",
        userId,
        title: "운영 메모",
        content: "# 운영 메모\n\n브랜드별 자주 쓰는 안내 문구와 상품별 확인 필요 사항을 기록합니다.\n",
        createdAt: ts,
        updatedAt: ts
      }
    ]
  };
}

export function createId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 18)}`;
}

export function timestamp() {
  return now();
}

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(STORAGE_DIR, { recursive: true });

  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(initialDb(), null, 2), "utf8");
  }
}

export async function readDb(): Promise<AppDb> {
  await ensureDataFile();
  const raw = await fs.readFile(DB_PATH, "utf8");
  const db = JSON.parse(raw) as AppDb;
  for (const user of db.users) {
    user.password ??= "1234";
  }
  return db;
}

export async function writeDb(db: AppDb) {
  await ensureDataFile();
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

let dbWriteQueue: Promise<unknown> = Promise.resolve();

export async function updateDb<T>(updater: (db: AppDb) => T | Promise<T>): Promise<T> {
  const operation = dbWriteQueue.then(async () => {
    const db = await readDb();
    const result = await updater(db);
    await writeDb(db);
    return result;
  });
  dbWriteQueue = operation.catch(() => undefined);
  return operation;
}

export async function getCurrentUserId() {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("로그인이 필요합니다.");
  return currentUser.id;
}

export async function getCurrentUser() {
  const db = await readDb();
  const userId = (await cookies()).get("detail_user_id")?.value;
  return db.users.find((user) => user.id === userId && user.status === "active") ?? null;
}

export function assetPath(storageKey: string) {
  const resolved = path.resolve(STORAGE_DIR, storageKey);
  if (!resolved.startsWith(STORAGE_DIR + path.sep) && resolved !== STORAGE_DIR) {
    throw new Error("Invalid asset path");
  }
  return resolved;
}

export async function saveAsset(input: {
  userId: string;
  kind: AssetKind;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<Asset> {
  const ext = path.extname(input.fileName) || extensionForMime(input.mimeType);
  const id = createId("asset");
  const storageKey = `${input.userId}/${input.kind}/${id}${ext}`;
  const fullPath = assetPath(storageKey);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, input.bytes);

  const asset: Asset = {
    id,
    userId: input.userId,
    kind: input.kind,
    storageKey,
    mimeType: input.mimeType || "application/octet-stream",
    sizeBytes: input.bytes.byteLength,
    width: null,
    height: null,
    createdAt: now()
  };

  await updateDb((db) => {
    db.assets.push(asset);
  });

  return asset;
}

export async function saveGeneratedSvg(userId: string, svg: string): Promise<Asset> {
  return saveAsset({
    userId,
    kind: "generated_cut",
    fileName: "generated.svg",
    mimeType: "image/svg+xml",
    bytes: Buffer.from(svg, "utf8")
  });
}

function extensionForMime(mimeType: string) {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/svg+xml") return ".svg";
  return ".bin";
}

export async function fileToBuffer(file: File) {
  return Buffer.from(await file.arrayBuffer());
}
