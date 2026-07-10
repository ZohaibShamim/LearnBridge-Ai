# CLAUDE.md — Frontend (`frontend/`)

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 dashboard. Auth UI, CV upload, roadmap viewer, and the quiz system. Read the root `../CLAUDE.md` first, and read **`../DESIGN.md` before touching any UI** — it documents the actual color/typography/component system extracted from this codebase, including bugs to fix rather than propagate. This file covers engineering conventions; `DESIGN.md` covers visual ones.

---

## 1. Priority order

**Correct → secure → scalable → minimal.** In this app specifically: "correct" includes matching `DESIGN.md`'s component vocabulary (don't invent a fourth button style); "secure" means the access-token-in-memory / refresh-token-in-httpOnly-cookie split stays intact (don't "fix" it by persisting tokens to `localStorage`); "scalable" means new heavy pages don't ship as one giant client bundle; "minimal" means checking `config/services/` and `hooks/` before writing a new one.

---

## 2. Use what's installed — don't hand-roll it

| Concern | Use this (already installed) | Don't |
|---|---|---|
| Data fetching/mutations | `@tanstack/react-query` | `useEffect` + `fetch`/`axios` by hand |
| HTTP client | the shared `api` instance in `config/instance/api.ts` (has the 401 single-flight refresh interceptor already built) | a second axios instance, raw `fetch` for backend calls |
| Client state | `zustand` (`store/auth.ts`) | Redux, a new Context-as-global-store for another domain |
| Icons | `lucide-react` | a second icon set |
| Styling | Tailwind CSS v4, utility classes per `DESIGN.md`'s tokens | CSS modules, styled-components, inline `style=` |
| Fonts | `next/font/google` (Geist Sans/Mono, already wired in `layout.tsx`) | a new `<link>` font import |

**Not installed — the real decision points:**
- **No UI kit.** Every modal, toast, and skeleton today is hand-rolled per-page (`Toast`, `OTPDialog`, `ConfirmationModal`, `QuizCardSkeleton` — four separate implementations of things that should be one each). Before adding a fifth, either (a) extract the existing pattern into `components/ui/` and reuse it, or (b) if the project is ready to formalize this, adopt **shadcn/ui** (copy-in, not a runtime dependency, composes cleanly with the Tailwind v4 setup already here) rather than hand-rolling a sixth bespoke modal. Don't add a full component library (MUI, Chakra) — it fights the existing utility-class-driven style documented in `DESIGN.md`.
- **No form library.** Forms are `useState` + manual validation today (login, signup, upload). That's fine for 2–3 fields (signup, login). The moment a form grows past that — a future quiz-builder form, a multi-field settings form — reach for **`react-hook-form` + `zod`** (Zod also gets you shared validation shape with a backend that adopts it — see `backend/CLAUDE.md` §2) instead of another hand-rolled `formData` object with manual `if` checks.
- **No animation library.** Motion today is Tailwind's `animate-in`/`fade-in`/`zoom-in`/`slide-in-from-*` utility classes. **Verify these actually render** before assuming they work — `tailwindcss-animate` (the plugin that typically ships these utilities) is not in `package.json`; confirm in a browser whether Tailwind v4's built-in animation utilities cover this or whether the plugin needs adding. Don't reach for Framer Motion for a simple modal entrance — these utility classes (once confirmed working) are the established pattern.
- **No testing framework.** See §8.

---

## 3. Architecture

```
app/
  (auth)/            → login, signup — no sidebar, public
  (with-sidebar)/    → dashboard, upload, roadmap/[jobId], roadmaps, quizzes, account-settings,
                        change-password, settings — MainLayout wraps these in <Sidebar/>
  (without-sidebar)/ → currently unused (no pages nested inside it) — see §6 dead code
components/
  landing/, layout/, providers/query-provider/, sidebar/
config/
  instance/api.ts    → the shared axios instance + interceptors — the ONLY place that should build a request
  services/          → one file per backend resource (auth, cv, quiz, roadmap) — service functions only, no React
  token/token.ts     → in-memory access-token store (deliberately not persisted — see DESIGN.md is silent on
                        this but it's a real security choice, keep it)
hooks/auth-hooks/    → useAuthProvider (the real auth context + redirect logic), useProtectedWrapper/
                        usePublicWrapper (dead — see §6)
store/auth.ts        → the one Zustand store — user object only, persisted; tokens excluded from persistence
```

**Auth flow, and why it's shaped this way:** access token lives in a module-level JS variable (`config/token/token.ts`), never `localStorage` — reduces XSS exposure, at the cost of being lost on hard refresh (mitigated by the silent-refresh-on-mount in `useAuthProvider`). Refresh token is an httpOnly cookie the frontend never reads directly. `store/auth.ts` persists only the `user` object to `localStorage`, explicitly excluding tokens (`partialize`). **Don't "simplify" this by moving tokens into the Zustand store's persisted state** — that's the one deliberate security trade-off in this codebase, keep it.

**Two-step OTP login** is implemented entirely inside `app/(auth)/login/page.tsx` (not extracted into a shared hook) — `loginUserStep1` → `verifyOTPAndLogin`, with `OTPDialog`/`OTPInput` as local components. If you add a second flow that needs OTP (e.g., email-change verification), extract `OTPDialog`/`OTPInput` into `components/` first rather than copy-pasting this file.

---

## 4. Conventions

**"use client" is currently the default everywhere** — there is no Server Component in this app today; every page starts with `"use client"`. That's acceptable for the current auth-gated, highly-interactive pages (dashboard, quizzes, upload), but don't treat it as the template going forward without thinking: a new page that's mostly static content (a help page, a static settings section) should be a Server Component by default, with `"use client"` pushed down to only the interactive leaf (a button, a form). Every `"use client"` you add is bundle size the browser has to download and hydrate — don't add it reflexively because every existing page has it.

**Comments: sparse, and only for the non-obvious.** Match the backend's policy. Worth a comment: why the access token is in-memory and not persisted (a future contributor will "fix" this as a bug if it's not explained), why `AUTH_ENDPOINTS` is excluded from the 401-refresh-retry logic in `api.ts` (infinite loop otherwise), why `partialize` excludes tokens in `store/auth.ts`. Not worth a comment: what a `useState` call does, what a Tailwind class renders as.

**Every service file currently redefines its own `ApiResponse<T>` interface** (`auth.service.ts`, `cv.service.ts`, `quiz.service.ts` each have their own copy; `roadmap.service.ts` imports it from `cv.service.ts`, an accidental cross-service dependency). When you next touch a service file, extract a shared `types/api.ts` with `ApiResponse<T>` and import it everywhere instead of adding a fifth copy or deepening the `roadmap.service.ts` → `cv.service.ts` coupling.

**`NEXT_PUBLIC_API_BASE_URL` is independently re-read via `process.env` in two places** (`config/instance/api.ts` and `useAuthProvider.tsx`), and `useAuthProvider.tsx`'s refresh call bypasses the shared `api` instance entirely with a raw `axios.post`. When you touch either file, consolidate: export `API_BASE_URL` from `config/instance/api.ts` and import it, and route the refresh call through the shared instance (or a dedicated exported function) so there's one axios configuration, not two that can drift.

---

## 5. Performance — "light and seamless"

- **Compositor-friendly motion only.** Animate `transform`/`opacity`, not `width`/`height`/`top`/`left` — this is already the pattern (`scale-105`, `translate-x-1`, `zoom-in`) in the codebase; don't introduce layout-thrashing animations on data-heavy views (the quiz question navigator grid, the roadmap step list).
- **Lazy-load what isn't visible on first paint.** Nothing in this app currently uses `next/dynamic`; as pages grow (a quiz results chart, a heavier roadmap visualization), reach for it rather than shipping everything in the initial bundle.
- **`useQuery`'s `staleTime` is already set to 60s app-wide** (`components/providers/query-provider`) — don't override it to `0` on individual queries without a real reason (a value that changes every second, e.g. job-status polling, correctly uses `refetchInterval` instead — see `roadmap/[jobId]/page.tsx` for the right pattern: 2s polling that stops once `status` is `completed`/`failed`).
- **Don't fetch what you can derive.** `roadmaps/page.tsx`'s `estimatedSteps` is computed from already-fetched data (`roadmap.roadmap.steps?.length`), not a second request — keep doing this instead of adding a summary endpoint for something derivable client-side.
- **Images**: the app currently uses plain `<img>` for CV preview (`upload/page.tsx`) and SVG illustrations. For any new user-uploaded or remote image that isn't a one-off preview, use `next/image` for automatic sizing/lazy-loading rather than a bare `<img>`.

---

## 6. Known dead code and bugs — clean up when you touch these, don't extend them

- **`app/components/sidebar/Sidebar.tsx`** is a stray, unused menu-item data snippet — not imported anywhere. The real sidebar is `components/sidebar/Sidebar.tsx`. Delete the stray file rather than editing it if you find yourself there.
- **`hooks/auth-hooks/useProtectedWrapper.tsx` and `usePublicWrapper.tsx`** are both dead — route protection actually happens via imperative `router.push` redirects inside `useAuthProvider`'s `useEffect`, not these wrapper components. They also export a colliding name (`ProtectedRoute`), and `usePublicWrapper`'s guard logic is commented out. Either wire them in properly (if per-route wrapping is actually wanted over the current global-redirect approach) or delete them — don't leave a third, half-working auth-guard pattern.
- **`(without-sidebar)` route group has no pages in it** — `(auth)/login` and `(auth)/signup` sit as siblings, not nested inside it, so its `layout.tsx` currently applies to nothing. Either move the auth pages into it or remove the unused layout.
- **Tailwind classes built from a JS variable will silently not render** — see `DESIGN.md`'s color-tokens section for the specific bug in `upload/page.tsx`'s role-selection buttons (`` `border-${role.color}-600` ``) and the fix (a literal-string lookup map). Don't replicate this pattern in new code, including quiz difficulty/category color-coding.
- **`globals.css`'s `body { font-family: Arial, ... }` overrides the Geist font variables** set up in `layout.tsx`, so the intended font isn't what's rendering. Fix by removing the hardcoded `font-family` and letting `--font-geist-sans` (set via `@theme inline`) apply.
- **Dashboard, quizzes list, and the quiz-taking page currently render hardcoded mock data** with real `useQuery` calls commented out (`quizzes/page.tsx`, `quizzes/[quizId]/page.tsx`), and `account-settings`/`change-password` are local-state-only stubs with `alert()` on submit. Don't assume any of these are wired to the backend without checking — and when you wire one up, remove the mock data and commented-out query rather than leaving both.

---

## 7. Accessibility

Baseline today is thin — a few `aria-label`s on the signup page's password-visibility toggles, little else. Icon-only buttons elsewhere (sidebar collapsed state, the upload page's remove-file button, quiz navigation arrows) lack labels. When you touch any icon-only interactive element, add an `aria-label` — don't wait for a dedicated accessibility pass. Loading and error states already exist as visible text/icons (good — keep pairing color with text, per `DESIGN.md`'s "no color-only error states" rule) rather than color alone.

---

## 8. Testing

**None exists today** — no Jest/Vitest/Playwright/Cypress config, no `test` script. Don't invent a full testing setup for a single small fix. If you're adding a non-trivial new flow (a quiz-builder, a new auth path), that's the right moment to introduce **Vitest + React Testing Library** for component/logic tests — it's the lowest-friction pairing with Vite-adjacent tooling and Next.js App Router today. Reserve end-to-end (Playwright) for after the core flows are more stable; don't front-load e2e infrastructure before there's a stable app to test against.

---

## 9. Environment variables

`NEXT_PUBLIC_API_BASE_URL` — the only one read anywhere in this app (`config/instance/api.ts`, `useAuthProvider.tsx`, both should consolidate to reading it once — see §4). Defaults to `http://localhost:8000/api/v1` in code, but **the backend's dev port is `8010`** in this environment's `backend/.env` — keep `frontend/.env.local` in sync with whatever port the backend actually runs on, and prefer setting it explicitly rather than relying on the stale hardcoded fallback.

---

## 10. Definition of done (frontend)

- [ ] Matches `DESIGN.md`'s component vocabulary — no new button/modal/badge style invented without checking it first.
- [ ] No dynamically-interpolated Tailwind class name introduced (verify in the browser, not just by reading the JSX).
- [ ] `"use client"` only where the page/component actually needs interactivity — not added reflexively.
- [ ] New icon-only interactive elements have an `aria-label`.
- [ ] No new duplicated `ApiResponse<T>` type, no new independent `process.env.NEXT_PUBLIC_API_BASE_URL` read, no second axios instance.
- [ ] Backend calls go through `config/services/*.ts` via the shared `api` instance — never a raw `fetch`/new axios instance in a component.
- [ ] Live-tested via claude-in-chrome per the root contract §5 — a component that type-checks is not a component that's been verified to render correctly.
