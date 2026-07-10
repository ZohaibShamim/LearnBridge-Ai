# DESIGN.md — LearnBridge AI

*An AI career-growth platform: upload a resume, get a personalized learning roadmap with curated videos and articles, and (new) test your knowledge with AI-generated quizzes along the way.*

---

## Product brief

LearnBridge AI turns a resume into a guided career path. A user uploads their CV and picks a target role (Data Scientist, Software Engineer, ML Engineer, AI Engineer); the AI analyzes it and generates a multi-step roadmap — each step with skills to learn and hand-picked YouTube/article resources. Users are job seekers, students, and working professionals leveling up technical skills, using the product at a desk, in planning mode, not mid-task under time pressure. The UI's job is to make **progress and "what's next" legible in a glance** — every screen that represents a journey (dashboard, roadmap, quiz) answers "how far am I" and "what do I do now" without the user having to hunt. We are now extending this into **AI-generated quizzes**: knowledge checks tied to roadmap skills, scored and reviewed in the same visual language as everything else — this is not a new sub-app, it's the same system answering a new question ("do I actually know this yet?").

This file documents the design system **as it is currently implemented** in the codebase (extracted from actual Tailwind usage across `frontend/app` and `frontend/components`), not an aspirational rewrite. Treat it as the contract for new screens — quizzes included.

---

## Design principles

1. **Progress is always visible.** Every journey screen — dashboard, roadmap, quiz — shows a progress bar, percentage, or step counter. A screen that represents forward motion without showing how much motion has happened is incomplete.
2. **One hero gradient moment per screen.** The blue→indigo gradient (`from-blue-600 to-indigo-600`) is this app's signature move — hero banners, the primary CTA, active nav state. It reads as "the important thing" precisely because it's rare. Do not apply it to more than one focal element per screen.
3. **Status color is a signal, never decoration.** Green means correct/completed/easy. Red means error/incorrect/hard/destructive. Yellow/amber means medium/warning. If you reach for one of these colors and the thing isn't actually in that state, you're about to teach users to ignore the signal.
4. **Timelines for sequence, cards for browsing.** Roadmap steps are a connected vertical timeline (you move through them in order). Quizzes, recommended courses, and saved roadmaps are grid cards (you're choosing which one to open). Don't put browsable content in a timeline or sequential content in a card grid.
5. **Soft elevation, not hard lines.** Hierarchy comes from `shadow-sm` → `shadow-lg` → colored glow shadows (`shadow-blue-500/25`), not heavy borders. Borders, when present, are pale (`border-slate-100`/`200`) and secondary to shadow.

---

## Color tokens

```yaml
primary:
  gradient: "from-blue-600 to-indigo-600"
  solid: "#2563EB"   # blue-600, used where a gradient would be excessive (small buttons, links, icons)
  # The one recognizable brand move. Primary CTAs, active/selected states, progress bar fills,
  # hero banners, step-number badges on the roadmap timeline.
  # Never used decoratively (backgrounds behind unrelated content) or more than once as a
  # gradient per screen — a screen with three gradient buttons has zero emphasis, not three.

neutral:
  text-heading: "slate-900"
  text-body: "slate-700"
  text-secondary: "slate-600"
  text-muted: "slate-400 / slate-500"
  surface-card: "white"
  surface-page: "gradient: from-slate-50 via-blue-50 to-indigo-50"
  # Nearly every full-page background in this app uses this exact three-stop gradient.
  # It is the "you're inside the app" signal — auth pages (login/signup) use it too, at
  # full saturation behind a white card. Treat it as the default page background; a flat
  # white or flat slate-50 page reads as unfinished next to the rest of the product.
  border-default: "slate-100 / slate-200"
  border-hover: "blue-200 / blue-300"

success:
  bg: "green-50 / green-100"
  text: "green-600 / green-700"
  # Reserved for: correct quiz answers, completed roadmap steps, "easy" difficulty,
  # save-succeeded toasts, completed status badges. Never used as a generic accent color
  # even when something is literally colored green in a mockup elsewhere — if it's not a
  # positive/complete state, it isn't this color.

error-destructive:
  bg: "red-50 / red-100"
  text: "red-600 / red-700"
  solid-button: "red-600"
  # Reserved for: incorrect quiz answers, "hard" difficulty, failed states, delete/destructive
  # buttons and their confirmation modals (red-100 icon circle + red-600 solid confirm button
  # is the established destructive-modal pattern — see roadmaps delete flow). Never decorative.

warning-medium:
  bg: "yellow-50 / amber-50"
  text: "yellow-600 / yellow-700"
  # "Medium" difficulty, "remaining questions" status, non-blocking warnings. One step down
  # from error in urgency — don't reach for red when yellow is the honest answer.

accent-secondary:
  purple: "purple-50/100 → purple-600/700   # tertiary stat callouts (e.g. time spent, categories)"
  orange: "orange-50/100 → orange-600/700   # secondary warm status (e.g. 'almost done', accuracy)"
  # These exist to differentiate same-shaped stat tiles sitting next to each other (a row of
  # four icon-chip stat cards each needs a different color or they blur together). They are
  # NOT semantic — don't attach meaning to "purple" or "orange" beyond "this stat is distinct
  # from its siblings." Never use for status (that's green/red/yellow's job).
```

**Known inconsistency to resolve, not propagate:** the sidebar's active-nav-item state uses `sky-600`, while literally everything else uses `blue-600`/`indigo-600` as primary. These render close enough to not be jarring today, but they are two different color families. New components should use `blue-600`, not `sky-600` — treat `sky` as legacy and migrate the sidebar when it's next touched.

**Real bug, not a style choice:** `upload/page.tsx`'s role-selection buttons build class names like `` `border-${role.color}-600` `` and `` `bg-${role.color}-50` `` from a JS variable. Tailwind's compiler only generates classes it can find as complete literal strings in source — dynamically interpolated class names like this are **silently dropped from the production build**. Don't replicate this pattern anywhere, including in new quiz-difficulty or category color-coding. Use a lookup object that maps to complete literal class strings instead:
```ts
const roleStyles = {
  blue: "border-blue-600 bg-blue-50 text-blue-900",
  purple: "border-purple-600 bg-purple-50 text-purple-900",
  // ...
} as const;
```

---

## Typography

Font family is **Geist Sans** (UI text, headings) and **Geist Mono** (the quiz timer, and anywhere a number needs to not visually shift as digits change) — loaded via `next/font/google` in `app/layout.tsx`. *(Current bug: `globals.css`'s `body { font-family: Arial, Helvetica, sans-serif }` overrides the Geist variable at the body level, so the intended font isn't actually what's rendering today. This file specifies the **intended** system — fix the override, don't design around it.)*

```yaml
display:
  size: 36–60px (text-4xl through text-6xl)
  weight: 700 (font-bold)
  usage: Landing hero headline only. One per page, and only on the landing page — app-interior
         pages top out at text-4xl for their page title (e.g. "Upload Your CV").

page-title:
  size: 24–30px (text-2xl / text-3xl)
  weight: 700 (font-bold)
  usage: The one title per screen inside the app shell — "Quiz Results", roadmap career goal,
         dashboard welcome banner. Never used inside a card.

card-title:
  size: 18–20px (text-lg / text-xl)
  weight: 600 (font-semibold)
  usage: Card headers — quiz card title, roadmap step title, stat card labels when they're the
         focal text. This is the ceiling for anything living inside a `rounded-2xl` card.

body:
  size: 14–16px (text-sm / text-base)
  weight: 400–500 (normal / font-medium)
  usage: Paragraph copy, descriptions, form input text. font-medium when the text is doing UI
         work (a nav label, a badge) rather than being read as prose.

label-caption:
  size: 12–13px (text-xs)
  weight: 500 (font-medium)
  usage: Stat tile labels ("Questions", "Time"), badge text, timestamps, helper text under
         inputs. Never used for anything clickable that needs a comfortable tap target — pair
         a text-xs label with a larger click area, don't make the label itself the only target.

stat-number:
  size: 24–30px (text-2xl / text-3xl)
  weight: 700 (font-bold)
  usage: The big number in a stat tile (dashboard "67%", quiz result correct-answer count).
         Always paired with a text-xs label above or below it — a stat-number alone with no
         label is a number, not a stat.
```

---

## Spacing

4px base unit (Tailwind default scale). Card interior padding is `p-5`/`p-6` for standard cards, `p-8`/`p-12` for hero banners and modals. Grid gaps are `gap-3` (tight, e.g. stat tile numbers) or `gap-6` (card grids). When in doubt, size up — this product's audience is scanning for "what's next," and cramped spacing reads as more to parse, not more efficient.

---

## Components

**Buttons.** There are exactly three tiers, and the tier communicates commitment level, not just visual weight. **Primary** — `bg-gradient-to-r from-blue-600 to-indigo-600`, white text, `rounded-xl`, plus a colored glow shadow (`shadow-lg shadow-blue-500/25`, intensifying to `/40` on hover). This is for the one action that moves the user forward: "Start Quiz," "Generate My Roadmap," "Sign In." **Secondary** — solid `slate-100` background, `slate-700` text, no gradient, no glow. This is for a real but lower-commitment action sitting next to a primary one: "Cancel," "Previous," "Back to Quizzes." **Destructive** — solid `red-600`, white text, always paired with a confirmation modal (never a bare destructive button on a list row). If you're reaching for a fourth visual style, you don't need a new button — you need to reconsider whether that action is actually primary, secondary, or destructive.

**Cards vs. timelines vs. rows.** Use a **card grid** (`rounded-2xl`, `shadow-sm border-slate-100`, hover lifts to `shadow-lg hover:border-blue-200`) when the user is choosing between multiple, comparable, independent items — quiz cards, recommended courses, saved roadmaps. Use a **connected timeline** (numbered gradient circles linked by a vertical gradient line) when items are ordered and the user moves through them sequentially — this is the roadmap steps pattern specifically, and it should stay specific to "a sequence the user progresses through," not be generalized to every list. Plain list rows (no card chrome, just dividers) don't currently appear in this app — before introducing one, check whether the content is actually better served by one of the two existing patterns first.

**Status & difficulty badges.** Always a pill (`rounded-full`), always a pastel background with a saturated text color from the *same* hue, always `text-xs font-medium`. Difficulty maps directly to the semantic status colors — easy→green, medium→yellow, hard→red — and category/type badges (e.g. "Programming," "YouTube," "Article") use blue as the neutral-but-branded default. A badge's color must be decodable without reading its text; if two different badge *meanings* would end up the same color on one screen, that's a sign one of them shouldn't be a badge.

**Progress bars.** `h-2`, `rounded-full`, a pale track (`bg-slate-100`/`200`) with a `bg-gradient-to-r from-blue-600 to-indigo-600` fill. Always paired with a numeric readout nearby (percentage or "X of Y") — the bar shows magnitude, the number shows precision; neither replaces the other. This is the one place the primary gradient can appear alongside other gradient elements on the same screen (a progress fill is not competing for "the important CTA" attention the way a second gradient button would).

**Modals.** Centered overlay, `bg-slate-900/50 backdrop-blur-sm` scrim, white panel at `rounded-2xl` (confirmation dialogs) or `rounded-3xl` (larger content like the role-selection modal), entrance via `animate-in fade-in zoom-in duration-200`. A destructive confirmation modal always leads with a `red-100` icon circle containing a `red-600` warning icon, centered, above the title — this icon-circle-first layout is the tell that "this is a confirmation, read before clicking." An informational/selection modal (role picker, OTP entry) uses the same shell but a `blue-100` icon circle instead.

**Forms.** Inputs are `rounded-lg`, `border-slate-300`, with a `focus:ring-2 focus:ring-blue-500` — no custom input component exists yet, every form hand-rolls this same set of classes, so match it exactly rather than inventing a slightly different focus style. Inline errors are a `red-50` background block with a `red-600` icon and message, placed directly below the field or form section it belongs to — never a color-only error state (a red border with no text is not sufficient, per the input's own validation message).

**Toasts.** Fixed `top-4 right-4`, solid `green-500` (success) or `red-500` (error) background, white text, auto-dismiss after 4 seconds. Used for the result of an action the user just took (login success, save failed) — not for passive/ambient status, which belongs in a badge or inline message instead.

**Stat tiles.** A white `rounded-2xl` card containing an icon in a pastel rounded-square chip (color varies per tile to differentiate siblings — see `accent-secondary` above), a `text-xs` label, and a bold `text-2xl`/`3xl` number. These appear in rows of 3–4 across the dashboard and quiz results pages. Icon chip color is decorative differentiation only, not a status signal — don't infer meaning from a stat tile being purple vs. orange.

**Quizzes — extend, don't reinvent.** The quiz system (list → detail/instructions → question-taking → results) already establishes the complete pattern for this feature: a gradient header banner introduces context (quiz title/category or, on results, the grade), stat-tile grids show quiz metadata (question count, time, difficulty), the question-answering flow uses the timeline card's white/`rounded-2xl`/`shadow-sm` shell with a progress bar at the top, answer options are `rounded-xl border-2` toggle buttons (selected = `border-blue-600 bg-blue-50`), and results use difficulty-broken-down progress bars plus color-coded (green/red) answer-review cards with a left accent border (`border-l-4`). When AI-generated quizzes ship, every new quiz-adjacent screen (a quiz builder, an AI-explanation panel, adaptive difficulty indicators) should read as a continuation of this exact system — same gradient header, same badge vocabulary, same grade-card color mapping (A=green, B=blue, C=yellow, D=orange, F=red) — not a visually distinct "AI feature" bolted onto the app.

---

## Explicit don'ts

```
- No dynamically-interpolated Tailwind class names (`` `bg-${variable}-600` ``) — Tailwind can't
  see them at build time and silently drops them. Use a literal-string lookup map instead.
- No more than one gradient CTA or gradient hero element per screen. A progress-bar fill doesn't
  count against this; a second gradient BUTTON does.
- Status colors (green/red/yellow) are reserved for actual status (correct/incorrect/complete/
  warning). Never used decoratively, including for "just needs a color" stat tiles — use the
  purple/orange secondary accents for that instead.
- No destructive action without a confirmation modal. Ever — including a future "delete quiz
  attempt" or "reset progress" action.
- No color-only error states. Every error is an icon + text message, never a border color alone.
- No new icon-only buttons without an accessible label — several exist today (sidebar collapsed
  state, upload page's remove-file button) and should get `aria-label`s when touched; don't add
  more unlabeled ones.
- No flat white or flat slate page backgrounds inside the app shell — use the established
  `from-slate-50 via-blue-50 to-indigo-50` gradient, matching every existing screen.
- No new brand-primary color. `blue-600`/`indigo-600` is it. Don't introduce a new hue for
  "AI-powered" features (quizzes included) just because they feel like a new feature — same
  primary, same system.
```
