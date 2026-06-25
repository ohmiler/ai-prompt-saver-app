import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSessionToken, hashSessionToken } from "@/lib/session-token";

describe("auth helpers", () => {
  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("password123");

    expect(hash).not.toBe("password123");
    await expect(verifyPassword("password123", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("creates unique 64-character hex session tokens", () => {
    const firstToken = createSessionToken();
    const secondToken = createSessionToken();

    expect(firstToken).toMatch(/^[a-f0-9]{64}$/);
    expect(secondToken).toMatch(/^[a-f0-9]{64}$/);
    expect(firstToken).not.toBe(secondToken);
  });

  it("hashes session tokens with a deterministic SHA-256 digest", () => {
    const token = "a".repeat(64);

    expect(hashSessionToken(token)).toBe(
      "ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb",
    );
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(hashSessionToken(token)).not.toBe(token);
  });
});
