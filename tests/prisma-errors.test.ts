import { describe, expect, it } from "vitest";
import { isPrismaUniqueConstraintError } from "@/lib/prisma-errors";

describe("prisma errors", () => {
  it("identifies Prisma unique constraint errors by code", () => {
    expect(isPrismaUniqueConstraintError({ code: "P2002" })).toBe(true);
  });

  it("rejects unrelated errors", () => {
    expect(isPrismaUniqueConstraintError(new Error("boom"))).toBe(false);
    expect(isPrismaUniqueConstraintError({ code: "P2025" })).toBe(false);
    expect(isPrismaUniqueConstraintError(null)).toBe(false);
  });
});
