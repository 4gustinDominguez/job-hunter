"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createSession, destroySession } from "@/app/_lib/auth";
import { AttemptLimiter, verifyPassword } from "@/app/_lib/password";

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export interface LoginState {
  error?: string;
}

const limiter = new AttemptLimiter();

async function clientKey(): Promise<string> {
  const store = await headers();
  return store.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { error: "Enter your username and password." };
  }

  const key = await clientKey();
  if (limiter.isBlocked(key)) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  const expectedUser = process.env.AUTH_USERNAME;
  const expectedHash = process.env.AUTH_PASSWORD_HASH;
  if (!expectedUser || !expectedHash) {
    return {
      error:
        "Auth is not configured on this server. Set AUTH_USERNAME / AUTH_PASSWORD_HASH (pnpm auth:hash).",
    };
  }

  const passwordOk = verifyPassword(parsed.data.password, expectedHash);
  const userOk = parsed.data.username === expectedUser;
  if (!userOk || !passwordOk) {
    limiter.fail(key);
    // Generic message — no user enumeration.
    return { error: "Invalid username or password." };
  }

  limiter.reset(key);
  await createSession();
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
