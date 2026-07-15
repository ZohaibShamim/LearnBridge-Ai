# Frontend — Overview

## What this app does

This is the actual website that users see and click around in — the part of Learn Bridge AI you'd open in a browser. It's built with **Next.js** (a framework, meaning a set of ready-made tools and conventions, built on top of **React**, the library that lets you build a UI out of reusable pieces called "components"). Through this app, a user can sign up and log in, upload their CV (resume/curriculum vitae — the document listing their education and work history), watch the AI generate a personalized career roadmap for them, view and save that roadmap, and take quizzes to check their progress. In short: everything the user directly sees and interacts with lives in this `frontend/` folder — it talks to the backend API to actually do things, but it doesn't do any of the heavy lifting (like AI calls or database writes) itself.

## How the files fit together

This `docs/frontend/` folder is split into several docs, each covering one slice of the frontend codebase, so a student presenting on a specific part can jump straight to the right file instead of reading everything:

- **`pages-auth-and-shell.md`** — the login/signup pages and the shared "shell" (things like the sidebar) that wraps the logged-in pages.
- **`pages-roadmap-and-upload.md`** — the CV upload page and the pages that show the AI-generated roadmap.
- **`pages-quiz-dashboard-settings.md`** — the quiz pages, the dashboard, and the account/settings pages.
- **`components.md`** — the bigger, reusable building blocks used across multiple pages (things like the sidebar itself, or the landing page).
- **`ui-primitives.md`** — the small, generic UI pieces (buttons, toasts/notifications, tooltips, spinners) that other components are built out of.
- **`services-hooks-store.md`** — the "plumbing" layer: the code that talks to the backend API, custom React hooks (reusable bits of logic), and the app's shared client-side state (data kept in the browser, like "who is currently logged in").

This file (`README.md`) is the starting point — it covers the three files that every single page passes through: `layout.tsx`, `page.tsx`, and `next.config.ts`.

**A quick note on the "App Router" folder structure**, since it explains a lot of what you'll see in the other docs: Next.js has a convention where the `app/` folder maps directly to URLs on the website. Any folder inside `app/` that contains a file named `page.tsx` becomes a real page at that folder's path — so `app/upload/page.tsx` becomes the `/upload` page, `app/login/page.tsx` becomes `/login`, and so on. A file named `layout.tsx` inside a folder wraps every page in that folder (and its subfolders) with shared UI — for example, a `layout.tsx` might add a sidebar around every "logged in" page, so you don't have to repeat that sidebar code on every single page file. The file covered below, `frontend/app/layout.tsx`, is the outermost one — it wraps literally every page in the entire app, because it sits at the very top of the `app/` folder.

## File by file

### `frontend/app/layout.tsx`

This is the **root layout** — the one wrapper that every single page in the app passes through, no matter which URL the user visits. Think of it as the outermost "frame" around the whole website.

- **Lines 11–19**: sets up the two fonts the app uses, `Geist` (a regular sans-serif font) and `Geist_Mono` (a monospace/fixed-width font, usually used for code-like text). These come from `next/font/google` (line 2), which is Next.js's built-in way of loading Google Fonts efficiently — it downloads and optimizes the font files at build time instead of the browser fetching them from Google directly.
- **Lines 21–25**: `metadata` — this is Next.js's built-in way of setting the page's `<title>` (what shows in the browser tab) and `<meta description>` (what shows up in search engine results and link previews). Here it's set to "LearnBridge AI — Your personalized career roadmap" with a short description of what the app does.
- **Lines 27–48**: the actual `RootLayout` component/function, which is what Next.js renders around every page's content (the `children` parameter on line 28 — this is standard React terminology for "whatever content got passed inside this wrapper," which in this case is whichever page the user is currently on).
  - Line 33–36: renders the base `<html>` and `<body>` tags (every Next.js app needs exactly one of these, and the root layout is where they live), applying the two font variables loaded above plus an `antialiased` class (a Tailwind CSS utility that smooths out font rendering).
  - Line 37, `<Providers>`: wraps everything in the app's React Query provider (imported on line 5 from `components/providers/query-provider`). React Query (also called TanStack Query) is a library that manages fetching data from the backend and caching it, so pages don't have to hand-write their own "fetch data and store it in state" logic every time.
  - Line 38, `<TooltipProvider>`: sets up tooltips (small pop-up hints that appear on hover) so any component anywhere in the app can show one without extra setup.
  - Lines 39–41: wraps the actual page content (`<AuthProvider>{children}</AuthProvider>`) in a React `<Suspense>` boundary with a `<Spinner page />` fallback — meaning if the page content isn't ready yet, the user sees a loading spinner instead of a blank screen. Inside that, `AuthProvider` (imported line 4, from `hooks/auth-hooks/useAuthProvider`) is what actually checks whether the user is logged in and redirects them if needed — this is the piece that gates access to the logged-in-only pages.
  - Line 43, `<Toaster />`: sets up toast notifications (the small pop-up messages you see in the corner of the screen after an action, like "Login successful") so any page can trigger one.

In plain English: this file is where the app wires up its global tools — fonts, the loading spinner, the "is this user logged in" check, data-fetching, tooltips, and pop-up notifications — once, so every page automatically gets all of them for free.

### `frontend/app/page.tsx`

This is the actual home page — what a visitor sees when they go to the site's root URL (`/`), before logging in.

- **Line 1**: imports `LandingPage` from `@/components/landing/landing` — this is the real content of the home page; it's a separate, reusable component rather than being written directly in this file.
- **Line 2**: imports `Image` from `next/image` (Next.js's optimized image component), but it's worth noting this import is never actually used anywhere in the file — the page doesn't render an `<Image>` tag.
- **Lines 4–10**: the `Home` component just renders `<LandingPage />` and nothing else (lines 6–8). So this file itself does almost no work — it's a thin wrapper whose only job is to satisfy Next.js's "a folder needs a `page.tsx` to become a URL" rule, and hand off the real content to the `LandingPage` component (covered in more detail in `components.md`).

In plain English: this file is short on purpose — it exists only because Next.js requires a `page.tsx` to define the `/` URL, and it immediately delegates the real landing-page content to a separate, reusable component.

### `frontend/next.config.ts`

This is the project's Next.js configuration file — settings that apply to the whole app at build/deploy time, rather than to any one page.

- **Lines 3–6**: the only setting configured here is `output: "standalone"`. In plain English, this tells Next.js to produce a minimal, self-contained build (all the files needed to run the app end up in a folder at `.next/standalone/`, including its own small server). This is specifically useful for deploying the app inside a Docker container (a standard way of packaging an app with everything it needs to run) — it means the deployed image doesn't need the entire `node_modules` folder or source code, just this trimmed-down output, which makes the deployed app smaller and faster to start.

Nothing else is configured here — no custom routing rules, no image domain allowlists, no environment variable rewrites. It's a deliberately minimal file.
