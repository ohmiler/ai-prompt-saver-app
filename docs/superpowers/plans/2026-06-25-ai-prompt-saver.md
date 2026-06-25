# AI Prompt Saver App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-user AI Prompt Saver app with email/password login, SQLite persistence, fixed categories, prompt CRUD, search, and the approved Split Workspace dashboard.

**Architecture:** Use Next.js App Router Server Components for data reads and Server Actions for auth and prompt mutations. Store users, sessions, and prompts in SQLite through Prisma; keep validation in pure TypeScript modules so the core behavior is testable without a browser.

**Tech Stack:** Next.js 16.2.9, React 19, TypeScript, Tailwind CSS 4, Prisma, SQLite, bcryptjs, Vitest, Server Actions, httpOnly session cookies.

---

## File Structure

- Create `prisma/schema.prisma`: Prisma SQLite schema for `User`, `Session`, and `Prompt`.
- Create `lib/categories.ts`: fixed prompt category constants and type guard.
- Create `lib/validation.ts`: pure validation helpers for auth and prompt forms.
- Create `lib/password.ts`: pure password hashing and verification helpers.
- Create `lib/db.ts`: shared Prisma client singleton.
- Create `lib/auth.ts`: password hashing, session creation, session lookup, and logout helpers.
- Create `lib/prompt-filters.ts`: pure Prisma where-builder for prompt search and category filtering.
- Create `lib/prompts.ts`: server-only prompt query functions scoped to user id.
- Create `app/actions/auth.ts`: register, login, and logout Server Actions.
- Create `app/actions/prompts.ts`: create, update, and delete prompt Server Actions.
- Create `app/login/page.tsx`: login page.
- Create `app/register/page.tsx`: registration page.
- Replace `app/page.tsx`: authenticated dashboard.
- Create `app/ui/auth-form.tsx`: reusable client auth form with `useActionState`.
- Create `app/ui/prompt-form.tsx`: client prompt create/edit form with `useActionState`.
- Create `app/ui/prompt-list.tsx`: prompt rows, edit state, and delete confirmation.
- Create `app/ui/search-box.tsx`: client search input that updates query params.
- Modify `app/layout.tsx`: app metadata.
- Modify `app/globals.css`: app-level visual foundation.
- Create `tests/validation.test.ts`: validation test coverage.
- Create `tests/auth.test.ts`: password/session helper test coverage.
- Create `tests/prompts.test.ts`: prompt ownership/search/filter test coverage.
- Modify `package.json`: add scripts and dependencies.
- Create `vitest.config.ts`: Vitest config.
- Create `.env`: local SQLite database URL for development.

## Task 1: Install Dependencies and Configure Tooling

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `.env`

- [ ] **Step 1: Install runtime dependencies**

Run:

```powershell
npm.cmd install @prisma/client bcryptjs
```

Expected: npm installs packages and updates `package.json` and `package-lock.json`.

- [ ] **Step 2: Install development dependencies**

Run:

```powershell
npm.cmd install -D prisma vitest tsx
```

Expected: npm installs packages and updates `package.json` and `package-lock.json`.

- [ ] **Step 3: Add test scripts**

Edit `package.json` so `scripts` contains:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest",
  "db:generate": "prisma generate",
  "db:push": "prisma db push"
}
```

- [ ] **Step 4: Create Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 5: Create local environment file**

Create `.env`:

```ini
DATABASE_URL="file:./dev.db"
AUTH_COOKIE_NAME="prompt_saver_session"
```

This file is intentionally ignored by `.gitignore`.

- [ ] **Step 6: Verify dependency setup**

Run:

```powershell
npm.cmd run test
```

Expected: Vitest runs and reports no test files found or passes once tests exist.

- [ ] **Step 7: Commit dependency setup**

Run:

```powershell
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add app dependencies and test tooling"
```

## Task 2: Add Prisma Schema and Generate Client

**Files:**
- Create: `prisma/schema.prisma`
- Modify: `.gitignore`
- Generated: `prisma/dev.db`

- [ ] **Step 1: Create Prisma schema**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  createdAt    DateTime  @default(now())
  sessions     Session[]
  prompts      Prompt[]
}

model Session {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
}

model Prompt {
  id        String   @id @default(cuid())
  userId    String
  title     String
  content   String
  category  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, category])
  @@index([updatedAt])
}
```

- [ ] **Step 2: Push schema to SQLite**

Run:

```powershell
npm.cmd run db:push
```

Expected: Prisma creates `prisma/dev.db` and generates the Prisma client.

- [ ] **Step 3: Ignore local SQLite database**

Add this line to `.gitignore`:

```gitignore
prisma/dev.db
```

- [ ] **Step 4: Verify Prisma client generation**

Run:

```powershell
npm.cmd run db:generate
```

Expected: Prisma reports the client was generated successfully.

- [ ] **Step 5: Commit database schema**

Run:

```powershell
git add prisma/schema.prisma .gitignore package.json package-lock.json
git commit -m "feat: add prisma sqlite schema"
```

Do not commit `prisma/dev.db`.

## Task 3: Add Category and Validation Core

**Files:**
- Create: `lib/categories.ts`
- Create: `lib/validation.ts`
- Create: `tests/validation.test.ts`

- [ ] **Step 1: Write failing validation tests**

Create `tests/validation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  normalizeEmail,
  validateLoginInput,
  validatePromptInput,
  validateRegisterInput,
} from "@/lib/validation";

describe("validation", () => {
  it("normalizes email", () => {
    expect(normalizeEmail("  USER@Example.COM ")).toBe("user@example.com");
  });

  it("rejects invalid registration input", () => {
    const result = validateRegisterInput({
      email: "bad-email",
      password: "123",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Enter a valid email and a password with at least 8 characters.");
    }
  });

  it("accepts valid login input", () => {
    const result = validateLoginInput({
      email: "person@example.com",
      password: "password123",
    });

    expect(result).toEqual({
      ok: true,
      value: {
        email: "person@example.com",
        password: "password123",
      },
    });
  });

  it("rejects blank prompt fields", () => {
    const result = validatePromptInput({
      title: " ",
      content: "",
      category: "Coding",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Title and content are required.");
    }
  });

  it("rejects unknown prompt categories", () => {
    const result = validatePromptInput({
      title: "A title",
      content: "Prompt content",
      category: "Sales",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Choose a valid category.");
    }
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm.cmd run test -- tests/validation.test.ts
```

Expected: FAIL because `@/lib/validation` does not exist.

- [ ] **Step 3: Add category constants**

Create `lib/categories.ts`:

```ts
export const PROMPT_CATEGORIES = [
  "Coding",
  "Marketing",
  "Writing",
  "Research",
] as const;

export type PromptCategory = (typeof PROMPT_CATEGORIES)[number];

export function isPromptCategory(value: unknown): value is PromptCategory {
  return (
    typeof value === "string" &&
    PROMPT_CATEGORIES.includes(value as PromptCategory)
  );
}
```

- [ ] **Step 4: Add validation helpers**

Create `lib/validation.ts`:

```ts
import { isPromptCategory, type PromptCategory } from "@/lib/categories";

type Result<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

type AuthInput = {
  email: unknown;
  password: unknown;
};

type PromptInput = {
  title: unknown;
  content: unknown;
  category: unknown;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validateRegisterInput(input: AuthInput): Result<{
  email: string;
  password: string;
}> {
  if (typeof input.email !== "string" || typeof input.password !== "string") {
    return {
      ok: false,
      message: "Enter a valid email and a password with at least 8 characters.",
    };
  }

  const email = normalizeEmail(input.email);
  const password = input.password;

  if (!email.includes("@") || password.length < 8) {
    return {
      ok: false,
      message: "Enter a valid email and a password with at least 8 characters.",
    };
  }

  return { ok: true, value: { email, password } };
}

export function validateLoginInput(input: AuthInput): Result<{
  email: string;
  password: string;
}> {
  if (typeof input.email !== "string" || typeof input.password !== "string") {
    return { ok: false, message: "Invalid email or password." };
  }

  const email = normalizeEmail(input.email);
  const password = input.password;

  if (!email || !password) {
    return { ok: false, message: "Invalid email or password." };
  }

  return { ok: true, value: { email, password } };
}

export function validatePromptInput(input: PromptInput): Result<{
  title: string;
  content: string;
  category: PromptCategory;
}> {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const content = typeof input.content === "string" ? input.content.trim() : "";

  if (!title || !content) {
    return { ok: false, message: "Title and content are required." };
  }

  if (!isPromptCategory(input.category)) {
    return { ok: false, message: "Choose a valid category." };
  }

  return {
    ok: true,
    value: {
      title,
      content,
      category: input.category,
    },
  };
}
```

- [ ] **Step 5: Run validation tests**

Run:

```powershell
npm.cmd run test -- tests/validation.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit validation core**

Run:

```powershell
git add lib/categories.ts lib/validation.ts tests/validation.test.ts
git commit -m "feat: add prompt validation core"
```

## Task 4: Add Database and Auth Helpers

**Files:**
- Create: `lib/password.ts`
- Create: `lib/db.ts`
- Create: `lib/auth.ts`
- Create: `tests/auth.test.ts`

- [ ] **Step 1: Write failing auth helper tests**

Create `tests/auth.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("auth helpers", () => {
  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("password123");

    expect(hash).not.toBe("password123");
    await expect(verifyPassword("password123", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
npm.cmd run test -- tests/auth.test.ts
```

Expected: FAIL because `@/lib/password` does not exist.

- [ ] **Step 3: Add password helpers**

Create `lib/password.ts`:

```ts
import bcrypt from "bcryptjs";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
```

- [ ] **Step 4: Add Prisma singleton**

Create `lib/db.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 5: Add auth helpers**

Create `lib/auth.ts`:

```ts
import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

const SESSION_DAYS = 30;
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? "prompt_saver_session";

export type CurrentUser = {
  id: string;
  email: string;
};

export function createSessionToken() {
  return randomBytes(32).toString("hex");
}

function sessionExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);
  return expiresAt;
}

export async function createSession(userId: string) {
  const token = createSessionToken();
  const expiresAt = sessionExpiry();

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt <= new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }

  cookieStore.delete(COOKIE_NAME);
}
```

- [ ] **Step 6: Run auth tests**

Run:

```powershell
npm.cmd run test -- tests/auth.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit auth helpers**

Run:

```powershell
git add lib/password.ts lib/db.ts lib/auth.ts tests/auth.test.ts
git commit -m "feat: add auth helpers"
```

## Task 5: Add Prompt Query Helpers

**Files:**
- Create: `lib/prompt-filters.ts`
- Create: `lib/prompts.ts`
- Create: `tests/prompts.test.ts`

- [ ] **Step 1: Write failing prompt query tests**

Create `tests/prompts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildPromptWhere } from "@/lib/prompt-filters";

describe("prompt queries", () => {
  it("scopes prompts to the current user", () => {
    expect(buildPromptWhere("user_1", undefined, undefined)).toEqual({
      userId: "user_1",
    });
  });

  it("adds title and content search", () => {
    expect(buildPromptWhere("user_1", "refactor", undefined)).toEqual({
      userId: "user_1",
      OR: [
        { title: { contains: "refactor" } },
        { content: { contains: "refactor" } },
      ],
    });
  });

  it("adds valid category filter", () => {
    expect(buildPromptWhere("user_1", undefined, "Coding")).toEqual({
      userId: "user_1",
      category: "Coding",
    });
  });

  it("ignores invalid category filter", () => {
    expect(buildPromptWhere("user_1", undefined, "Sales")).toEqual({
      userId: "user_1",
    });
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
npm.cmd run test -- tests/prompts.test.ts
```

Expected: FAIL because `@/lib/prompt-filters` does not exist.

- [ ] **Step 3: Add pure prompt filter helper**

Create `lib/prompt-filters.ts`:

```ts
import type { Prisma } from "@prisma/client";
import { isPromptCategory } from "@/lib/categories";

export function buildPromptWhere(
  userId: string,
  query: string | undefined,
  category: string | undefined,
): Prisma.PromptWhereInput {
  const where: Prisma.PromptWhereInput = { userId };
  const trimmedQuery = query?.trim();

  if (trimmedQuery) {
    where.OR = [
      { title: { contains: trimmedQuery } },
      { content: { contains: trimmedQuery } },
    ];
  }

  if (isPromptCategory(category)) {
    where.category = category;
  }

  return where;
}
```

- [ ] **Step 4: Add server-only prompt query helpers**

Create `lib/prompts.ts`:

```ts
import "server-only";

import { buildPromptWhere } from "@/lib/prompt-filters";
import { prisma } from "@/lib/db";

export async function getPromptsForUser(
  userId: string,
  query?: string,
  category?: string,
) {
  return prisma.prompt.findMany({
    where: buildPromptWhere(userId, query, category),
    orderBy: { updatedAt: "desc" },
  });
}
```

- [ ] **Step 5: Run prompt tests**

Run:

```powershell
npm.cmd run test -- tests/prompts.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit prompt query helpers**

Run:

```powershell
git add lib/prompt-filters.ts lib/prompts.ts tests/prompts.test.ts
git commit -m "feat: add prompt query helpers"
```

## Task 6: Add Auth Server Actions and Pages

**Files:**
- Create: `app/actions/auth.ts`
- Create: `app/ui/auth-form.tsx`
- Create: `app/login/page.tsx`
- Create: `app/register/page.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Add auth Server Actions**

Create `app/actions/auth.ts`:

```ts
"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import {
  clearSession,
  createSession,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { validateLoginInput, validateRegisterInput } from "@/lib/validation";

export type AuthActionState = {
  message: string;
};

const initialError = { message: "" };

export async function registerAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const input = validateRegisterInput({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!input.ok) {
    return { message: input.message };
  }

  try {
    const user = await prisma.user.create({
      data: {
        email: input.value.email,
        passwordHash: await hashPassword(input.value.password),
      },
    });

    await createSession(user.id);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { message: "An account with this email already exists." };
    }

    return { message: "Could not create account. Please try again." };
  }

  redirect("/");
}

export async function loginAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const input = validateLoginInput({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!input.ok) {
    return { message: input.message };
  }

  const user = await prisma.user.findUnique({
    where: { email: input.value.email },
  });

  if (!user) {
    return { message: "Invalid email or password." };
  }

  const passwordValid = await verifyPassword(
    input.value.password,
    user.passwordHash,
  );

  if (!passwordValid) {
    return { message: "Invalid email or password." };
  }

  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

export const emptyAuthState = initialError;
```

- [ ] **Step 2: Add reusable auth form**

Create `app/ui/auth-form.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthActionState } from "@/app/actions/auth";

type AuthFormProps = {
  action: (
    state: AuthActionState,
    formData: FormData,
  ) => Promise<AuthActionState>;
  buttonLabel: string;
  footerLabel: string;
  footerHref: string;
  footerLink: string;
};

const initialState: AuthActionState = { message: "" };

export function AuthForm({
  action,
  buttonLabel,
  footerLabel,
  footerHref,
  footerLink,
}: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="auth-form">
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" minLength={8} required />
      </label>
      {state.message ? (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      ) : null}
      <button type="submit" disabled={pending}>
        {pending ? "Working..." : buttonLabel}
      </button>
      <p className="auth-footer">
        {footerLabel} <Link href={footerHref}>{footerLink}</Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 3: Add login page**

Create `app/login/page.tsx`:

```tsx
import { loginAction } from "@/app/actions/auth";
import { AuthForm } from "@/app/ui/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">AI Prompt Saver</p>
        <h1>Log in</h1>
        <AuthForm
          action={loginAction}
          buttonLabel="Log in"
          footerLabel="New here?"
          footerHref="/register"
          footerLink="Create an account"
        />
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Add register page**

Create `app/register/page.tsx`:

```tsx
import { registerAction } from "@/app/actions/auth";
import { AuthForm } from "@/app/ui/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">AI Prompt Saver</p>
        <h1>Create account</h1>
        <AuthForm
          action={registerAction}
          buttonLabel="Create account"
          footerLabel="Already have an account?"
          footerHref="/login"
          footerLink="Log in"
        />
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Update metadata**

Edit `app/layout.tsx` metadata:

```ts
export const metadata: Metadata = {
  title: "AI Prompt Saver",
  description: "Save, search, and organize reusable AI prompts.",
};
```

- [ ] **Step 6: Run verification**

Run:

```powershell
npm.cmd run lint
npm.cmd run test
```

Expected: lint and tests pass.

- [ ] **Step 7: Commit auth pages**

Run:

```powershell
git add app/actions/auth.ts app/ui/auth-form.tsx app/login/page.tsx app/register/page.tsx app/layout.tsx
git commit -m "feat: add email password auth pages"
```

## Task 7: Add Prompt Server Actions

**Files:**
- Create: `app/actions/prompts.ts`

- [ ] **Step 1: Add prompt action types and create action**

Create `app/actions/prompts.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { validatePromptInput } from "@/lib/validation";

export type PromptActionState = {
  message: string;
};

export const emptyPromptState: PromptActionState = { message: "" };

export async function createPromptAction(
  _state: PromptActionState,
  formData: FormData,
): Promise<PromptActionState> {
  const user = await requireUser();
  const input = validatePromptInput({
    title: formData.get("title"),
    content: formData.get("content"),
    category: formData.get("category"),
  });

  if (!input.ok) {
    return { message: input.message };
  }

  await prisma.prompt.create({
    data: {
      ...input.value,
      userId: user.id,
    },
  });

  revalidatePath("/");
  return { message: "" };
}
```

- [ ] **Step 2: Add update and delete actions**

Append to `app/actions/prompts.ts`:

```ts
export async function updatePromptAction(
  promptId: string,
  _state: PromptActionState,
  formData: FormData,
): Promise<PromptActionState> {
  const user = await requireUser();
  const input = validatePromptInput({
    title: formData.get("title"),
    content: formData.get("content"),
    category: formData.get("category"),
  });

  if (!input.ok) {
    return { message: input.message };
  }

  const result = await prisma.prompt.updateMany({
    where: {
      id: promptId,
      userId: user.id,
    },
    data: input.value,
  });

  if (result.count === 0) {
    return { message: "Prompt not found." };
  }

  revalidatePath("/");
  return { message: "" };
}

export async function deletePromptAction(formData: FormData) {
  const user = await requireUser();
  const promptId = formData.get("promptId");

  if (typeof promptId !== "string" || !promptId) {
    return;
  }

  await prisma.prompt.deleteMany({
    where: {
      id: promptId,
      userId: user.id,
    },
  });

  revalidatePath("/");
}
```

- [ ] **Step 3: Run verification**

Run:

```powershell
npm.cmd run lint
npm.cmd run test
```

Expected: lint and tests pass.

- [ ] **Step 4: Commit prompt actions**

Run:

```powershell
git add app/actions/prompts.ts
git commit -m "feat: add prompt server actions"
```

## Task 8: Build Split Workspace Dashboard

**Files:**
- Replace: `app/page.tsx`
- Create: `app/ui/search-box.tsx`
- Create: `app/ui/prompt-form.tsx`
- Create: `app/ui/prompt-list.tsx`

- [ ] **Step 1: Add search box**

Create `app/ui/search-box.tsx`:

```tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function updateSearch(value: string) {
    const params = new URLSearchParams(searchParams);

    if (value.trim()) {
      params.set("q", value);
    } else {
      params.delete("q");
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <input
      className="search-input"
      defaultValue={searchParams.get("q") ?? ""}
      name="q"
      onChange={(event) => updateSearch(event.target.value)}
      placeholder={pending ? "Searching..." : "Search title or content"}
      type="search"
    />
  );
}
```

- [ ] **Step 2: Add prompt form**

Create `app/ui/prompt-form.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import {
  createPromptAction,
  type PromptActionState,
  updatePromptAction,
} from "@/app/actions/prompts";
import { PROMPT_CATEGORIES, type PromptCategory } from "@/lib/categories";

type PromptFormProps = {
  prompt?: {
    id: string;
    title: string;
    content: string;
    category: string;
  };
  onDone?: () => void;
};

const initialState: PromptActionState = { message: "" };

export function PromptForm({ prompt, onDone }: PromptFormProps) {
  const action = prompt
    ? updatePromptAction.bind(null, prompt.id)
    : createPromptAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="prompt-form">
      <div className="form-heading">
        <h2>{prompt ? "Edit prompt" : "Add prompt"}</h2>
        {prompt ? (
          <button type="button" onClick={onDone} className="ghost-button">
            Cancel
          </button>
        ) : null}
      </div>
      <label>
        Title
        <input name="title" required defaultValue={prompt?.title ?? ""} />
      </label>
      <label>
        Category
        <select
          name="category"
          required
          defaultValue={(prompt?.category as PromptCategory) ?? "Coding"}
        >
          {PROMPT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label>
        Prompt
        <textarea
          name="content"
          required
          rows={8}
          defaultValue={prompt?.content ?? ""}
        />
      </label>
      {state.message ? (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      ) : null}
      <button type="submit" disabled={pending}>
        {pending ? "Saving..." : prompt ? "Save changes" : "Save prompt"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Add prompt list**

Create `app/ui/prompt-list.tsx`:

```tsx
"use client";

import { useState } from "react";
import { deletePromptAction } from "@/app/actions/prompts";
import { PromptForm } from "@/app/ui/prompt-form";

type Prompt = {
  id: string;
  title: string;
  content: string;
  category: string;
  updatedAt: Date;
};

type PromptListProps = {
  prompts: Prompt[];
};

export function PromptList({ prompts }: PromptListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (prompts.length === 0) {
    return (
      <div className="empty-state">
        <h2>No prompts found</h2>
        <p>Create a prompt or adjust your search and category filter.</p>
      </div>
    );
  }

  return (
    <div className="prompt-list">
      {prompts.map((prompt) => {
        const editing = editingId === prompt.id;

        return (
          <article className="prompt-card" key={prompt.id}>
            {editing ? (
              <PromptForm prompt={prompt} onDone={() => setEditingId(null)} />
            ) : (
              <>
                <div className="prompt-card-header">
                  <div>
                    <p className="category-label">{prompt.category}</p>
                    <h2>{prompt.title}</h2>
                  </div>
                  <div className="prompt-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => setEditingId(prompt.id)}
                    >
                      Edit
                    </button>
                    <form
                      action={deletePromptAction}
                      onSubmit={(event) => {
                        if (!confirm("Delete this prompt?")) {
                          event.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="promptId" value={prompt.id} />
                      <button type="submit" className="danger-button">
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
                <p className="prompt-content">{prompt.content}</p>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Replace dashboard page**

Replace `app/page.tsx`:

```tsx
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { PromptForm } from "@/app/ui/prompt-form";
import { PromptList } from "@/app/ui/prompt-list";
import { SearchBox } from "@/app/ui/search-box";
import { PROMPT_CATEGORIES } from "@/lib/categories";
import { requireUser } from "@/lib/auth";
import { getPromptsForUser } from "@/lib/prompts";

type HomeProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const user = await requireUser();
  const params = await searchParams;
  const prompts = await getPromptsForUser(user.id, params.q, params.category);

  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">AI Prompt Saver</p>
          <h1>Prompt Library</h1>
        </div>
        <nav className="category-nav" aria-label="Prompt categories">
          <Link className={!params.category ? "active" : ""} href="/">
            All prompts
          </Link>
          {PROMPT_CATEGORIES.map((category) => (
            <Link
              className={params.category === category ? "active" : ""}
              href={`/?category=${category}`}
              key={category}
            >
              {category}
            </Link>
          ))}
        </nav>
        <form action={logoutAction}>
          <button type="submit" className="ghost-button full-width">
            Log out
          </button>
        </form>
        <p className="user-email">{user.email}</p>
      </aside>

      <section className="dashboard-main">
        <div className="toolbar">
          <SearchBox />
        </div>
        <div className="workspace-grid">
          <section className="list-panel" aria-label="Saved prompts">
            <PromptList prompts={prompts} />
          </section>
          <aside className="editor-panel" aria-label="Create prompt">
            <PromptForm />
          </aside>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Run verification**

Run:

```powershell
npm.cmd run lint
npm.cmd run test
```

Expected: lint and tests pass.

- [ ] **Step 6: Commit dashboard**

Run:

```powershell
git add app/page.tsx app/ui/search-box.tsx app/ui/prompt-form.tsx app/ui/prompt-list.tsx
git commit -m "feat: add prompt dashboard"
```

## Task 9: Add App Styling

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace global styles**

Replace `app/globals.css`:

```css
@import "tailwindcss";

:root {
  --background: #f7f6f2;
  --foreground: #171615;
  --muted: #67625a;
  --line: #ddd8cd;
  --panel: #fffefa;
  --panel-soft: #ece8dd;
  --accent: #116a63;
  --danger: #9f2f25;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

a {
  color: inherit;
  text-decoration: none;
}

.auth-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 24px;
}

.auth-panel {
  width: min(420px, 100%);
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  padding: 28px;
  box-shadow: 0 16px 50px rgba(23, 22, 21, 0.08);
}

.auth-panel h1,
.sidebar h1,
.form-heading h2,
.prompt-card h2,
.empty-state h2 {
  margin: 0;
}

.eyebrow,
.category-label,
.user-email {
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.auth-form,
.prompt-form {
  display: grid;
  gap: 14px;
  margin-top: 22px;
}

label {
  display: grid;
  gap: 7px;
  color: #34312d;
  font-size: 14px;
  font-weight: 700;
}

input,
select,
textarea {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff;
  color: var(--foreground);
  padding: 11px 12px;
}

textarea {
  resize: vertical;
}

.auth-form button,
.prompt-form button[type="submit"] {
  border: 0;
  border-radius: 6px;
  background: var(--accent);
  color: #fff;
  padding: 12px 14px;
  font-weight: 800;
}

.auth-footer {
  margin: 0;
  color: var(--muted);
}

.auth-footer a {
  color: var(--accent);
  font-weight: 800;
}

.form-error {
  margin: 0;
  border: 1px solid rgba(159, 47, 37, 0.3);
  border-radius: 6px;
  background: rgba(159, 47, 37, 0.08);
  color: var(--danger);
  padding: 10px 12px;
}

.dashboard-shell {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  min-height: 100vh;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
  border-right: 1px solid var(--line);
  background: var(--panel);
  padding: 24px;
}

.category-nav {
  display: grid;
  gap: 8px;
}

.category-nav a,
.ghost-button,
.danger-button {
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff;
  color: #393530;
  padding: 10px 12px;
  text-align: left;
}

.category-nav a.active {
  border-color: rgba(17, 106, 99, 0.35);
  background: rgba(17, 106, 99, 0.08);
  color: var(--accent);
  font-weight: 800;
}

.ghost-button,
.danger-button {
  display: inline-flex;
  justify-content: center;
  font-weight: 800;
}

.danger-button {
  border-color: rgba(159, 47, 37, 0.25);
  color: var(--danger);
}

.full-width {
  width: 100%;
}

.dashboard-main {
  min-width: 0;
  padding: 24px;
}

.toolbar {
  margin-bottom: 16px;
}

.search-input {
  max-width: 720px;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
  gap: 16px;
  align-items: start;
}

.list-panel,
.editor-panel,
.prompt-card,
.empty-state {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}

.list-panel,
.editor-panel {
  padding: 14px;
}

.prompt-list {
  display: grid;
  gap: 12px;
}

.prompt-card,
.empty-state {
  padding: 16px;
}

.prompt-card-header,
.form-heading,
.prompt-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.prompt-actions {
  align-items: center;
  flex-wrap: wrap;
}

.prompt-content {
  margin: 14px 0 0;
  color: var(--muted);
  line-height: 1.55;
  white-space: pre-wrap;
}

.empty-state p {
  color: var(--muted);
}

@media (max-width: 920px) {
  .dashboard-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }

  .category-nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .workspace-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Run verification**

Run:

```powershell
npm.cmd run lint
npm.cmd run build
```

Expected: lint and build pass.

- [ ] **Step 3: Commit styling**

Run:

```powershell
git add app/globals.css
git commit -m "style: add prompt saver interface styles"
```

## Task 10: Browser Verification and Final Polish

**Files:**
- Modify files found by verification only.

- [ ] **Step 1: Start development server**

Run:

```powershell
npm.cmd run dev
```

Expected: Next.js starts on `http://localhost:3000`.

- [ ] **Step 2: Verify auth flow manually**

In the browser:

1. Open `http://localhost:3000`.
2. Confirm unauthenticated users redirect to `/login`.
3. Open `/register`.
4. Register `first@example.com` with password `password123`.
5. Confirm redirect to `/`.
6. Log out.
7. Log in with the same credentials.

Expected: registration, logout, and login work without console errors.

- [ ] **Step 3: Verify prompt CRUD manually**

In the browser:

1. Create a Coding prompt titled `Refactor helper`.
2. Create a Marketing prompt titled `Launch email`.
3. Edit `Refactor helper` content.
4. Delete `Launch email` and confirm the deletion prompt.

Expected: create, edit, and delete all update the dashboard.

- [ ] **Step 4: Verify search and filter manually**

In the browser:

1. Search for a word in a title.
2. Search for a word only present in prompt content.
3. Filter by Coding.
4. Filter by Research with no matching prompts.

Expected: search checks title and content; category filter scopes results; empty state appears for no results.

- [ ] **Step 5: Verify user isolation manually**

In the browser:

1. Register `second@example.com` with password `password123`.
2. Confirm first user's prompts are not visible.
3. Create a prompt for the second user.
4. Log out and log back in as `first@example.com`.
5. Confirm second user's prompt is not visible.

Expected: users only see their own prompts.

- [ ] **Step 6: Run final automated checks**

Run:

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

Expected: all checks pass.

- [ ] **Step 7: Commit final polish if needed**

If any fixes were needed, run:

```powershell
git add app lib tests prisma package.json package-lock.json
git commit -m "fix: polish prompt saver flows"
```

If no fixes were needed, do not create an empty commit.

## Self-Review Notes

- Spec coverage: auth, per-user prompt isolation, fixed categories, prompt CRUD, search title/content, dashboard-first flow, Split Workspace layout, error handling, and verification are covered.
- Placeholder scan: no incomplete planning markers remain.
- Type consistency: category strings use `PROMPT_CATEGORIES`; prompt actions use `PromptActionState`; auth actions use `AuthActionState`; dashboard prompt shape matches Prisma fields used in UI.
