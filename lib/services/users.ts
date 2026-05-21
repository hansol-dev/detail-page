import "server-only";
import { createId, readDb, timestamp, updateDb } from "../store";
import type { User } from "../types";

export async function listUsers() {
  const db = await readDb();
  return db.users;
}

export async function createUser(input: { email: string; displayName: string; role?: "admin" | "user" }) {
  if (!input.email.trim() || !input.displayName.trim()) {
    throw new Error("email and displayName are required");
  }

  return updateDb<User>((db) => {
    if (db.users.some((user) => user.email === input.email.trim())) {
      throw new Error("A user with this email already exists");
    }

    const ts = timestamp();
      const user: User = {
      id: createId("user"),
      email: input.email.trim(),
      displayName: input.displayName.trim(),
      password: "1234",
      role: input.role ?? "user",
      status: "active",
      createdAt: ts,
      updatedAt: ts
    };
    db.users.push(user);
    return user;
  });
}
