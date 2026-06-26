import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("production build portability", () => {
  it("does not require Google Fonts network access during build", () => {
    const layoutSource = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");

    expect(layoutSource).not.toContain("next/font/google");
  });
});
