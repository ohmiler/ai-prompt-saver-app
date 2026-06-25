<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AI Prompt Saver App Agent Guide

## Project Summary

This repository is a Next.js app for saving reusable AI prompts. The intended product is a multi-user prompt library with email/password login, SQLite persistence, fixed categories, prompt CRUD, and search across prompt title and content.

The primary authenticated screen is the dashboard/list view. Do not turn the app into a marketing landing page.

## Stack

- Next.js 16.2.9 with the App Router
- React 19
- TypeScript
- Tailwind CSS 4
- SQLite through Prisma
- Email/password authentication with hashed passwords
- Server Components for reads and Server Actions for mutations

Before changing Next.js code, read the relevant installed docs under `node_modules/next/dist/docs/`. Useful docs for this app usually include:

- `01-app/01-getting-started/02-project-structure.md`
- `01-app/01-getting-started/05-server-and-client-components.md`
- `01-app/01-getting-started/07-mutating-data.md`
- `01-app/02-guides/forms.md`
- `01-app/01-getting-started/15-route-handlers.md`

## Core Requirements

- Users can register and log in with email and password.
- Users can add, edit, and delete prompts.
- Prompt fields are limited to title, content, and category.
- Categories are fixed by the system: Coding, Marketing, Writing, Research.
- Search must match both prompt title and prompt content.
- Prompt data must be private per user.
- The first authenticated screen is the dashboard/list view.
- The approved UI direction is a Split Workspace dashboard.

## Architecture Rules

- Keep data reads in Server Components or server-only helpers.
- Use Server Actions for auth and prompt mutations.
- Keep client components small and only for interactivity such as form state, pending state, edit mode, delete confirmation, and search input behavior.
- Put shared validation and filtering logic in pure TypeScript helpers so it can be unit tested without a browser.
- Keep database access behind server-only modules.
- Use `revalidatePath("/")` after prompt mutations that affect the dashboard.

## Security Rules

- Never store plain-text passwords.
- Normalize emails before lookup or creation.
- Use safe, generic login failure messages.
- Every prompt query must be scoped by the current user's id.
- Every prompt update and delete must check ownership.
- Do not expose session tokens, password hashes, or internal database errors to the UI.
- Session cookies should be httpOnly, sameSite lax, secure in production, and scoped to `/`.

## Data Model Expectations

Expected entities:

- `User`: id, email, passwordHash, createdAt
- `Session`: token or token digest, userId, expiresAt, createdAt
- `Prompt`: id, userId, title, content, category, createdAt, updatedAt

Useful constraints:

- `User.email` is unique.
- `Prompt.userId` references `User.id`.
- Index prompt queries by user id and category where practical.

## UI Direction

- Build the actual dashboard as the first app surface after login.
- Use a quiet productivity UI, not a hero/marketing page.
- Keep the Split Workspace layout:
  - Sidebar: app name, category navigation, logout, current email.
  - Main area: search input, prompt list, and create/edit form.
- Keep cards compact and useful.
- Avoid decorative gradients, oversized hero sections, nested cards, and one-note palettes.
- Ensure mobile layouts stack cleanly and text never overlaps controls.
- After successful prompt creation, reset the create form.
- After successful prompt edit, return to list mode and show updated content.

## Validation Expectations

- Registration requires a valid email and a password of at least 8 characters.
- Login requires non-empty email and password.
- Prompt title and content are required after trimming.
- Prompt category must be one of the fixed system categories.
- Invalid form submissions should return short user-facing messages.

## Useful Commands

Run these from the repository or feature worktree root:

```powershell
npm.cmd run dev
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run db:generate
npm.cmd run db:push
```

If a script is missing in `package.json`, add it before relying on it.

## Verification Checklist

Before claiming completion, run:

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

For auth or prompt-flow changes, also verify in a browser:

- Unauthenticated `/` redirects to `/login`.
- Register works.
- Logout works.
- Login works.
- Create prompt works.
- Edit prompt works.
- Delete prompt works and asks for confirmation.
- Search finds title matches.
- Search finds content-only matches.
- Category filtering works.
- A second user cannot see the first user's prompts.

## Git Notes

- Prefer feature branches for implementation work.
- Do not commit local SQLite databases or generated runtime logs.
- Do not revert user changes unless explicitly asked.
- Keep commits focused around the task being performed.
