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
