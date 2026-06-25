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
      expect(result.message).toBe(
        "Enter a valid email and a password with at least 8 characters.",
      );
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
