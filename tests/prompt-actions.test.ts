import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const updateManyMock = vi.fn();
const deleteManyMock = vi.fn();
const requireUserMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    prompt: {
      create: createMock,
      updateMany: updateManyMock,
      deleteMany: deleteManyMock,
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  requireUser: requireUserMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

describe("prompt actions", () => {
  beforeEach(() => {
    createMock.mockReset();
    updateManyMock.mockReset();
    deleteManyMock.mockReset();
    requireUserMock.mockReset();
    revalidatePathMock.mockReset();
    requireUserMock.mockResolvedValue({ id: "user_1", email: "a@example.com" });
  });

  it("creates a prompt for the current user", async () => {
    const { createPromptAction } = await import("@/app/actions/prompts");
    const formData = new FormData();
    formData.set("title", " Refactor helper ");
    formData.set("content", " Improve this code ");
    formData.set("category", "Coding");

    await expect(
      createPromptAction({ message: "" }, formData),
    ).resolves.toEqual({ message: "" });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        userId: "user_1",
        title: "Refactor helper",
        content: "Improve this code",
        category: "Coding",
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });

  it("returns validation errors without writing", async () => {
    const { createPromptAction } = await import("@/app/actions/prompts");
    const formData = new FormData();
    formData.set("title", "");
    formData.set("content", "Prompt content");
    formData.set("category", "Coding");

    await expect(
      createPromptAction({ message: "" }, formData),
    ).resolves.toEqual({ message: "Title and content are required." });

    expect(createMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("updates only a prompt owned by the current user", async () => {
    updateManyMock.mockResolvedValue({ count: 1 });
    const { updatePromptAction } = await import("@/app/actions/prompts");
    const formData = new FormData();
    formData.set("title", "Updated");
    formData.set("content", "New content");
    formData.set("category", "Writing");

    await expect(
      updatePromptAction("prompt_1", { message: "" }, formData),
    ).resolves.toEqual({ message: "" });

    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        id: "prompt_1",
        userId: "user_1",
      },
      data: {
        title: "Updated",
        content: "New content",
        category: "Writing",
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });

  it("returns not found when update ownership check matches nothing", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });
    const { updatePromptAction } = await import("@/app/actions/prompts");
    const formData = new FormData();
    formData.set("title", "Updated");
    formData.set("content", "New content");
    formData.set("category", "Writing");

    await expect(
      updatePromptAction("prompt_1", { message: "" }, formData),
    ).resolves.toEqual({ message: "Prompt not found." });

    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("deletes only a prompt owned by the current user", async () => {
    const { deletePromptAction } = await import("@/app/actions/prompts");
    const formData = new FormData();
    formData.set("promptId", "prompt_1");

    await deletePromptAction(formData);

    expect(deleteManyMock).toHaveBeenCalledWith({
      where: {
        id: "prompt_1",
        userId: "user_1",
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });
});
