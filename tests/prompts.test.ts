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
