# Frontend — UI Primitives (the design-system building blocks)

## What this is

This folder (`frontend/components/ui/`) holds the small, reusable, pre-styled building blocks that the rest of the app is assembled from — things like buttons, cards, pop-up windows (modals), and little notification banners (toasts). Instead of every page inventing its own version of a "button" or a "loading spinner" with slightly different colors and corners, every page imports the same shared piece from here. That's what people mean by a "design system": one source of truth for how a piece of UI looks and behaves, reused everywhere, so the whole app feels consistent instead of like it was stitched together by five different people.

A few of these pieces are built on top of **Radix UI** or **Vaul** — small third-party libraries that handle the fiddly, easy-to-get-wrong behavior (keyboard navigation, screen-reader support, trapping focus inside a pop-up, closing on outside click) so this codebase only has to supply the colors and spacing (the "styling") on top.

## File by file

### `frontend/components/ui/badge.tsx`

`Badge` — lines 46–66. Renders a small rounded "pill" of text, the kind you'd use for a short label like a difficulty level ("Easy") or a grade ("A"). It takes a `tone` prop (`brand`, `neutral`, `success`, `warning`, `danger`, `purple`, `orange` — defined lines 8–15) that controls its pastel background + matching text color (lines 17–25), plus an optional `icon` to show before the text. Two helper lookup tables ship alongside it: `difficultyTone` (lines 28–35, maps "easy/medium/hard" or "beginner/intermediate/advanced" to a color) and `gradeTone` (lines 38–44, maps letter grades A–F to a color). Likely used anywhere the app shows a short status or category label — quiz difficulty tags, roadmap step tags, grade results.

### `frontend/components/ui/button.tsx`

`Button` — lines 48–64. The standard clickable button used everywhere in the app. It supports five `variant`s (type lines 13, styles lines 22–32): `primary` (solid brand-gradient color with a glow — meant for the one main action on a screen, like "Submit"), `secondary` (plain gray background, for a lower-priority action next to a primary one), `destructive` (solid red, for actions like "Delete" that should always be paired with a confirmation step), `ghost` (no background until hovered, for quiet/minor actions), and `outline` (a bordered button with a white background, for secondary chrome like toolbar buttons). It also supports four `size`s — `sm`, `md`, `lg`, `icon` (an icon-only square button) — defined lines 34–39, and a `loading` prop that swaps in a spinning icon (`Loader2`, line 59) and disables the button while something is in progress.

### `frontend/components/ui/card.tsx`

Three small pieces, all sharing a "soft, rounded surface" look instead of a hard-edged box.
- `Card` — lines 13–27. The generic rounded, shadowed container (a `rounded-2xl` box with a soft shadow) that most content blocks sit inside — stat panels, list rows, roadmap step cards. Its `interactive` prop (used on things like a grid of clickable cards) adds a hover "lift" effect: it nudges up slightly and gets a bigger shadow when the mouse is over it, signaling it can be clicked.
- `CardHeader` — lines 29–31. Just a flex row wrapper, meant to line up an icon and a title at the top of a card.
- `IconChip` — lines 34–51. A small rounded-square "chip" with a pastel blue background, meant to hold an icon at the front of a card or stat header (for example, a small icon next to "Total Roadmaps").

### `frontend/components/ui/drawer.tsx`

`Drawer` — lines 11–55. A real, actively-styled component (not a stub) built on the **Vaul** library. A "drawer" here means a panel that slides in from one edge of the screen and can usually be dragged back off-screen to dismiss it — think of a mobile app's side menu, or a bottom sheet that slides up. This one supports three `side`s (lines 21, 26–32): `"left"` (for a mobile navigation menu), `"right"` (for a detail panel sliding in from the right), and `"bottom"` (a sheet that slides up from the bottom, common on mobile). Vaul itself supplies the drag-to-dismiss gesture, focus trapping, and scroll locking — this file only supplies the sizing, rounded corners, and the small drag-handle bar shown at the top of bottom sheets (lines 46–48).

### `frontend/components/ui/empty-state.tsx`

`EmptyState` — lines 5–32. A single reusable layout for "there's nothing here yet" screens — an icon, a bold title, an optional description sentence, and an optional action button, all centered inside a `Card`. Likely used for things like "You haven't saved any roadmaps yet" or "No quizzes available," with the action button being something like "Upload your CV" or "Take a quiz."

### `frontend/components/ui/index.ts`

This file (17 lines) doesn't render anything itself — it just re-exports everything from every other file in this folder in one place. That means other files in the app can write one clean import line, like `import { Button, Card, Modal } from "@/components/ui"`, instead of having a separate `import` line pointing at `button.tsx`, `card.tsx`, `modal.tsx`, and so on. This is a common pattern called a "barrel file" — it just tidies up imports, no actual logic lives here.

### `frontend/components/ui/modal.tsx`

A **modal** is a small window that pops up on top of the page and blocks interaction with everything behind it until the user closes it or completes an action — used here for things like "Are you sure you want to delete this roadmap?" confirmations. This one is built on **Radix UI's Dialog** primitive, which supplies the actual show/hide mechanics, trapping keyboard focus inside the modal while open, closing on the Escape key, and locking the background from scrolling — this file only supplies the visual styling on top.

- `Modal` — lines 12–61. The main component. It's shown or hidden purely by the `open` boolean prop the caller passes in (typically backed by a `useState` in the page using it) — setting `open` to `true` makes it appear, `false` makes it disappear, and `onOpenChange` fires whenever Radix wants to close it (e.g., the user clicked outside it or hit Escape), so the caller can update its own state to match. It also takes a `size` (`sm`/`md`/`lg`, line 29) controlling the modal's width, and a `showClose` prop for whether the small "X" close button in the top-right corner (lines 49–56) appears.
- `ModalIcon` — lines 64–81. An optional circular icon badge meant to sit at the top of the modal's content, colored by `tone` (`brand` blue for informational modals, `danger` red for destructive/delete confirmations, `success` green for a positive confirmation).
- `ModalTitle` / `ModalDescription` / `ModalClose` — lines 83–85. These are just Radix's own `Dialog.Title`, `Dialog.Description`, and `Dialog.Close` re-exported directly under friendlier names, so a page building a modal's content can import them from this one file instead of from Radix directly. `Title`/`Description` exist mainly so screen readers can correctly announce what the modal is about; `Close` is any element that should close the modal when clicked (not just the built-in X button).

### `frontend/components/ui/progress.tsx`

`Progress` — lines 8–40. A horizontal progress bar: a thin rounded track (line 26) with a filled-in bar (lines 28–37) whose width is set by the `value` prop (a percentage, clamped between 0 and 100 on line 19). The `tone` prop switches the fill between the app's brand color gradient (default) or green (`tone="success"`, meant for a fully-completed item). Likely used for things like "3 of 8 roadmap steps completed" or a quiz-completion bar.

### `frontend/components/ui/skeleton.tsx`

`Skeleton` — lines 7–20. A gray placeholder block with an animated "shimmer" (a band of light sweeping across it, lines 12–14) shown while real content is still loading — for example, a gray rectangle standing in for a card or a line of text before the actual data comes back from the backend. This is a common alternative to a spinner when you want the loading screen to roughly match the shape of the content that's about to appear.

### `frontend/components/ui/slider.tsx`

`Slider` — lines 10–50. A draggable horizontal slider control (the kind you'd drag left/right to pick a number), built on **Radix UI's Slider** primitive for the pointer-dragging and keyboard-arrow-key behavior. It takes a numeric `value`, a `min`/`max`/`step` range, and calls `onValueChange` whenever the user drags it. Given this app's quiz feature, this is very likely the control used to let a user pick how many questions they want in a quiz (a "quiz question count" slider).

### `frontend/components/ui/spinner.tsx`

`Spinner` — lines 5–23. A simple spinning-circle loading indicator (using the `Loader2` icon from `lucide-react`, spun via a CSS animation). Passing the `page` prop switches it from a small inline icon into a full-page centered version with an optional text `label` underneath (e.g., "Loading your roadmap…") — used for whole-page loading states, like waiting for the initial page data to arrive.

### `frontend/components/ui/stat-tile.tsx`

`StatTile` — lines 20–45. A card designed specifically for dashboard-style summary numbers: a colored icon chip (lines 37–39, color chosen from the `chip` prop — blue/green/orange/purple/amber/indigo, defined lines 9–18), a small label above a large bold number, and an optional smaller hint line underneath. The comment in the file (lines 6–7) is explicit that the chip color is just for visually telling sibling tiles apart — it's not meant to signal good/bad status. Likely used on the dashboard for things like "Total Roadmaps: 4" or "Quizzes Completed: 12".

### `frontend/components/ui/toast.tsx`

A **toast** is a small temporary notification banner that pops up (usually in a corner of the screen) to confirm the result of something the user just did — for example, "Roadmap saved successfully!" or "Something went wrong, please try again." — and then disappears on its own after a few seconds. This file wraps the **Sonner** library rather than building the pop-up mechanics from scratch.

- `Toaster` — lines 10–31. This is the "host" component that actually renders toasts on screen; it's meant to be mounted exactly once, high up in the app (in the root layout), not per-page. It configures where toasts appear (`top-right`), how long they stay before auto-dismissing (`duration={4000}`, i.e. 4 seconds), and the specific colors for success (green), error (red), and info (dark) toasts (lines 17–28).
- `toast` — imported from Sonner on line 3 and re-exported on line 33. This is the actual function other files call to trigger a toast — anywhere else in the app, code can just call something like `toast.success("Roadmap saved!")` or `toast.error("Upload failed")`, and it will show up whichever page is currently open, as long as `<Toaster />` is mounted somewhere in the tree.

### `frontend/components/ui/tooltip.tsx`

A tooltip is the small text hint that appears when you hover your mouse over something, like an icon-only button, to explain what it does. This one is built on **Radix UI's Tooltip** primitive for the hover-timing and keyboard/screen-reader behavior.

- `TooltipProvider` — lines 7–13. Meant to wrap the whole app (or a large section of it) once, so every `Tooltip` inside it shares the same timing settings — a 200ms delay before showing (`delayDuration`), and a 300ms grace period where hovering a second tooltip skips the delay (`skipDelayDuration`).
- `Tooltip` — lines 16–46. The actual tooltip component: wrap it around whatever should trigger the hint (usually an icon button), and pass the hint text as the `content` prop. The `side` prop controls which side of the trigger element the tooltip pops up on (top/right/bottom/left). Likely used on icon-only buttons that don't have visible text next to them — for example, a collapsed sidebar's icons, or a small "remove file" button on the upload page — so a mouse-hovering user (and a screen reader, via Radix's built-in accessibility handling) can still tell what the button does.
