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
