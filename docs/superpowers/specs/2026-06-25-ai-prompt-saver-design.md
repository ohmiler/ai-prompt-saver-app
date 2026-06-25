# AI Prompt Saver App Design

## Context

Build a multi-user AI Prompt Saver app in the existing Next.js project. The app uses Next.js 16.2.9 with the App Router, React 19, Tailwind CSS 4, and SQLite for persistence.

Project guidance in `AGENTS.md` requires reading the installed Next.js docs before coding because this Next.js version may differ from older conventions. Relevant docs reviewed:

- `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`
- `node_modules/next/dist/docs/01-app/02-guides/forms.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`

## Goals

- Users can register and log in with email and password.
- Each user can create, edit, delete, search, and categorize their own prompts.
- Prompt data is private per user.
- Categories are fixed by the system: Coding, Marketing, Writing, Research.
- Each prompt has only title, content, and category.
- Search checks both title and content.
- The first screen after login is the dashboard/list view, not a landing page.
- The dashboard uses the approved Split Workspace layout.

## Non-Goals

- OAuth login.
- User-created categories.
- Tags, descriptions, notes, favorites, sharing, teams, billing, or AI prompt generation.
- A marketing landing page.

## Recommended Approach

Use Next.js Server Components and Server Actions with Prisma, SQLite, and credentials-based authentication.

This keeps database reads and mutations on the server, fits the App Router guidance from the installed docs, and gives a cleaner path for user isolation than a mostly client-side API approach. Prisma should manage the SQLite schema and migrations. Authentication should use a credentials flow with hashed passwords.

Alternative approaches considered:

- Route Handlers plus client-side fetch: flexible, but more client state and loading/error plumbing for a straightforward CRUD app.
- Direct SQLite with fully custom auth: fewer dependencies, but more security-sensitive code to maintain.

## Architecture

The app has three primary surfaces:

- `/login`: email/password sign-in form.
- `/register`: email/password account creation form.
- `/`: authenticated dashboard. Unauthenticated users are redirected to `/login`.

The dashboard is a Split Workspace:

- Left sidebar: fixed category navigation plus an "All prompts" view.
- Main area: search input, add prompt action, prompt list, and an inline create/edit panel.
- Prompt rows/cards show title, category, content snippet, edit action, and delete action.

Server Components should fetch prompt data for the current user. Client Components should be used only where interactivity is needed, such as form state, pending states, confirmation UI, or search input behavior.

## Data Model

`User`

- `id`: unique identifier.
- `email`: unique email address.
- `passwordHash`: hashed password.
- `createdAt`: account creation timestamp.

`Prompt`

- `id`: unique identifier.
- `userId`: owner user id.
- `title`: prompt title.
- `content`: prompt body.
- `category`: one of Coding, Marketing, Writing, Research.
- `createdAt`: creation timestamp.
- `updatedAt`: last update timestamp.

Important constraints:

- `User.email` is unique.
- `Prompt.userId` references `User.id`.
- All prompt reads and writes must include the current session user id.

## Data Flow

Dashboard reads:

- The dashboard receives `searchParams` for `q` and `category`.
- Server-side data access loads prompts for the current user only.
- Search filters by title and content.
- Category filters by the fixed category set.

Mutations:

- Register creates a user with a hashed password.
- Create prompt validates title, content, and category, then inserts a prompt for the current user.
- Update prompt validates input and confirms the prompt belongs to the current user before updating.
- Delete prompt confirms ownership before deleting.
- After prompt mutations, the app refreshes dashboard data with `revalidatePath("/")`.

## Validation and Security

- Email and password are validated on registration and login.
- Passwords are stored only as hashes.
- Prompt title and content must not be empty after trimming.
- Prompt category must match the fixed category list.
- Every Server Action that reads or mutates user data verifies the session.
- Prompt ownership is checked in update and delete actions.
- Auth failures and validation failures return safe, user-facing messages.

## Error Handling

- Registration shows clear errors for duplicate email, invalid email, weak/missing password, and missing fields.
- Login shows a generic invalid credentials message.
- Prompt forms show validation errors near the form.
- If a user is unauthenticated or the session expires, protected routes redirect to `/login`.
- Empty dashboard results show a focused empty state with a create prompt action.
- Failed deletes or updates show a short error without exposing internal details.

## UI Details

The approved layout is Split Workspace.

Desktop:

- Sidebar remains visible with All, Coding, Marketing, Writing, and Research.
- Main content prioritizes search, add prompt, and a dense but readable list.
- Create/edit UI appears as an inline panel next to or above the prompt list, depending on available width.

Mobile:

- Sidebar collapses into a compact category control.
- Search and create actions remain at the top.
- Prompt rows stack without text overlap.
- Create/edit UI appears as a stacked form below the toolbar and above the list.

Visual tone:

- Quiet productivity UI.
- Restrained color palette with clear contrast.
- Avoid a marketing hero page.
- Keep cards compact and useful rather than decorative.

## Testing and Verification

Automated verification should include:

- Lint.
- Build.
- Data/action coverage for prompt validation, user isolation, search by title/content, category filtering, create, update, and delete where practical for the selected stack.

Manual browser verification should cover:

- Register.
- Login.
- Redirect behavior for unauthenticated users.
- Create prompt.
- Edit prompt.
- Delete prompt with confirmation.
- Search by title.
- Search by content.
- Filter by category.
- Confirm one user cannot see another user's prompts.

## Final Design Decisions

- Use Split Workspace as the dashboard layout.
- Use an inline create/edit panel on desktop.
- Use a stacked create/edit form on mobile.
- Use Server Actions for prompt mutations.
- Use credentials-based email/password authentication.
