# Frontend — Upload CV & Roadmap Pages

## What this is

This is the heart of the whole app: the four pages that take a user from "I have a CV" to "I have a personalized, trackable career roadmap." A user uploads their CV and picks a target role, watches a loading screen while an AI (a computer program that reads the CV and writes a study plan) works in the background, then sees the finished roadmap and can save it. Saved roadmaps show up in a list the user can browse, delete, or open again. Opening a saved roadmap shows either a simple checklist or a more advanced "guided learning" experience with quizzes, depending on what kind of roadmap the AI generated. Every one of these four files is a React "page" component — a chunk of code that decides what shows up on screen for one URL in the app.

## File by file

### `frontend/app/(with-sidebar)/upload/page.tsx`

This is the very first screen: pick a role, pick a file, hit upload.

- **`RoleSelectionModal`** — lines 61–139. A pop-up (modal) that appears the moment the page loads, asking "which career role do you want a roadmap for?" (Data Scientist, Software Engineer, Machine Learning Engineer, or AI Engineer). It exists as its own component because a modal has its own self-contained job — show four choices as radio-button-style options, track which one is picked, and close when the user clicks Continue or Cancel. It doesn't fetch or send any data itself; it just reports the user's choice back to the parent page via the `onSelectRole` function it's given.

- **`UploadPage`** (the default export) — lines 141–507. This is the actual page. It holds all the state: which file was picked, a preview image if it's a picture, any error message, and which role was selected. Its most important piece is the upload mutation:
  - **`uploadMutation`** (a `useMutation` call) — lines 151–164. A "mutation" in React Query terms just means "a data-sending action" (as opposed to a `useQuery`, which is for reading data). Here it sends the CV file and chosen role to the backend via `uploadCV(file, role)`. If it succeeds, the backend hands back a `jobId` (an ID for the background task that's about to process this CV), and the code immediately redirects the browser to `/roadmap/{jobId}` — the next page in this doc — so the user can watch progress. If it fails, the error message is shown on the page instead.

  The rest of the file is straightforward UI logic: `handleFile`/`handleFileChange` (lines 173–206) validate the file type and size (must be JPG/PNG/PDF/DOCX, under 10MB) and generate an image preview if it's a photo; `handleDrag`/`handleDrop` (lines 208–227) support drag-and-drop; `handleUpload` (lines 229–238) is what actually fires the mutation when the user clicks the big "Generate My Roadmap" button. Notice the file picker and upload button are disabled until a role is chosen — the page won't even let you pick a file before you've chosen a role.

### `frontend/app/(with-sidebar)/roadmap/[jobId]/page.tsx`

This page is shown right after upload. The `[jobId]` in the folder name means this URL has a dynamic segment — the actual job ID from the previous page becomes part of the URL, like `/roadmap/abc123`. This page can show three completely different things depending on what's happening: a "still working" animation, an error screen, or the finished roadmap.

- **`ProcessingAnimation`** — lines 40–157. The loading screen with a progress bar and a checklist of steps ("CV Uploaded", "Extracting text...", "Analyzing skills", "Generating roadmap...", "Finding resources..."). It exists as its own component so the polling page (below) can just say "show this while we wait" without cluttering the main logic. It has no data fetching of its own — it's handed the current job status as a prop and lights up each step as complete/active/pending based on that.

- **`ErrorState`** — lines 160–182. A reusable "something went wrong" screen with a retry button and a button to go back to `/upload`. It's pulled out as its own component because both this page and the roadmap-viewer page (further down) need an identical error screen — no reason to write it twice... except this file does write it twice anyway (see `roadmaps/[roadmapId]/page.tsx` below, which has its own copy).

- **`ResourceCard`** — lines 185–243. Renders one clickable "learning resource" tile — a YouTube video or an article link — with an icon that changes depending on which type it is. It's split out because each roadmap step can have several resources, so this one card gets reused in a loop.

- **`SubtopicPreview`** — lines 248–278. A small read-only card previewing a "subtopic" (a sub-topic under a bigger roadmap step, used by the newer guided-learning roadmaps). On this page it's just a preview — no quizzes can be taken yet, because quizzes only become available once a roadmap has actually been saved (subtopics need a permanent ID from the database first).

- **`StepCard`** — lines 281–379. One big roadmap step (e.g., "Learn Python Basics"), shown as an expandable card with a numbered circle, a description, skills to learn, subtopics (if any), and resources. Clicking the card expands or collapses it. This is its own component because the roadmap has many steps and each one needs identical expand/collapse behavior.

  **The timeline connector line**, mentioned in the code comment at lines 289–297: between each step's numbered circle and the next one, there's a thin vertical line so the steps look like a connected timeline. In plain English: that line is built with flexbox (a CSS layout tool) so it automatically stretches to exactly fill the gap down to the next circle — no matter how tall or short the card's content is (a step with a one-line description versus a step with ten resources both get a perfectly connected line, because the code never has to guess a pixel height).

- **`RoadmapDisplay`** — lines 382–519. The component that actually renders the finished roadmap once the AI is done: the hero section with the career goal, a skill-gap summary, the list of `StepCard`s, and a "Save Roadmap" button.

  **The "Save Roadmap" button**, `handleSaveRoadmap` — lines 388–415. When clicked, it sends the AI-generated roadmap to the backend to be permanently saved (`saveRoadmap(...)`, a one-off async call, not a `useMutation` — it just sets a `isSaving` loading flag by hand). Once the save succeeds, two things happen: it tells React Query "the saved-roadmaps list is now out of date, refetch it next time it's needed" (`invalidateQueries`), and then it redirects the browser to `/roadmaps?highlight={savedId}` — the roadmaps list page, with the brand-new roadmap's ID tagged onto the URL. That `highlight` part is what lets the very next page draw a colored ring around the card the user just created, so they can immediately spot it in the list instead of hunting for it.

  **Data fetching / polling** — the actual page component, `RoadmapPage` — lines 522–575, is what does the fetching:
  - **`useQuery`** — lines 527–541, calling `getJobStatus(jobId)`. This is the query that repeatedly checks on the background AI job.
  - **The polling** (`refetchInterval`, lines 530–538): every 2 seconds, the browser asks the backend "is this job done yet?" and stops asking once the status becomes `completed` or `failed`. In plain English: the browser has no way of knowing the moment the AI finishes working somewhere else on the server, so instead it just keeps asking "are you done yet?" every couple of seconds until the answer is yes.

  Which of the three states renders is decided at lines 549–574: if still loading or the status isn't `completed`/`failed` yet, show `ProcessingAnimation`; if the query itself errored out, or the job's status is `failed`, show `ErrorState`; otherwise show `RoadmapDisplay` with the finished data.

### `frontend/app/(with-sidebar)/roadmaps/page.tsx`

The "My Roadmaps" page — a grid of every roadmap the user has saved.

- **`DeleteRoadmapModal`** — lines 22–78. A confirmation pop-up ("Are you sure you want to delete this?") shown before a roadmap is actually deleted, so a stray click on the trash icon can't destroy data by accident. It's blocked from being dismissed (via Escape key or clicking outside) while the delete request is still in flight, so the user can't confuse the app by cancelling mid-delete.

- **`RoadmapCard`** — lines 81–223. One tile in the grid: title, creation date, career goal, a few stats (step count, timeline, level), tags, and a delete button. It owns its own **delete-with-confirmation flow**: clicking the trash icon (`handleDeleteClick`, lines 92–95) just opens the `DeleteRoadmapModal` rather than deleting immediately; only confirming inside that modal (`handleConfirmDelete`, lines 97–110) actually calls `deleteRoadmap(...)` and then tells React Query to refetch the list so the deleted card disappears right away.

  **The "highlight the newly saved roadmap" behavior**: each card receives a `highlighted` boolean prop (line 81, set at line 309 by comparing the card's own ID to the `highlight` value read from the URL). If it matches, the card gets a blue ring drawn around it (`ring-2 ring-blue-500 ring-offset-2`, line 144) and a `useEffect` (lines 88–90) scrolls it into view as soon as the page loads — so after saving a roadmap on the previous page, the user lands here and their eyes go straight to it without having to scroll and search.

- **`RoadmapCardSkeleton`** — lines 226–239. A gray placeholder shape shown in place of a real card while the list is still loading, so the page doesn't flash empty/blank first.

- **`RoadmapsPage`** (default export) — lines 242–316. The page itself. It reads the `highlight` URL parameter with `searchParams.get("highlight")` (line 245) and fetches the saved roadmaps with **`useQuery`** — lines 246–252, calling `getRoadmaps`. This query isn't polling (it's a one-time list, not something the AI is actively working on) — instead it's set to always refetch on mount and on window focus, so if the user deletes a roadmap in another tab or comes back after saving one, the list is never stale. The page then shows either the skeleton grid (loading), an error card, an empty-state message ("No Roadmaps Yet"), or the real grid of `RoadmapCard`s.

### `frontend/app/(with-sidebar)/roadmaps/[roadmapId]/page.tsx`

This is the most complex of the four files: it's the page you land on when you open one specific saved roadmap. The key thing to understand is that there are **two entirely different views** this page can render for the same kind of data, and the code picks between them automatically.

**The rule that decides which view shows** — line 417: `const hasSubtopics = steps.some((s) => s.subtopics && s.subtopics.length > 0);`. In plain English: if even one step in this roadmap has "subtopics" attached to it, the whole page switches into **guided mode**. If none of the steps have subtopics, it falls back to the **flat (legacy) mode** — a plain checklist. This matters because older roadmaps (saved before the subtopic/quiz feature existed) simply don't have subtopic data, so they automatically get the simpler view; newer AI-generated roadmaps come with subtopics built in and automatically get the richer, guided view.

**Flat (legacy) mode — a plain checklist:**
- **`StepCard`** — lines 80–181. One roadmap step with an expand/collapse card, a description, skills, resources, and a single "Mark this step complete" button at the bottom. Clicking it just flips that step between complete/incomplete and saves the change to the backend. This is deliberately the older, simpler version — no quizzes, no locking, just checking things off by hand.

**Guided mode — subtopics with quizzes, locking, and badges:**
- **`SubtopicRow`** — lines 184–264. One subtopic inside a bigger step, showing its own resources plus three buttons: Easy, Medium, and Hard (a "difficulty" the user picks for a quiz on that subtopic). Clicking a difficulty button starts (or resumes) a quiz for that subtopic at that difficulty.
- **`SubtopicStepCard`** — lines 267–369. The guided-mode equivalent of `StepCard` above — instead of one "mark complete" button, it lists all of that step's subtopics (using `SubtopicRow`) and shows whether the whole topic is locked, in progress, or fully cleared.

  **The locking rule**, in plain English: a topic (step) unlocks only once every single subtopic in the *previous* topic has been cleared. This is computed by `topicUnlocked` (lines 428–433): the very first step is always unlocked; every step after that checks whether *all* of the previous step's subtopics appear in the "cleared" set — if even one hasn't been cleared yet, the current step stays locked (shown with a padlock icon and a grayed-out card, and its quiz buttons are disabled).

  **What "clearing" a subtopic means**: passing that subtopic's **Medium** quiz (the code's own on-page hint at line 259 says "Pass Medium (60%+) to clear"). Once cleared, a subtopic gets a green "Cleared" badge (lines 208–212) and counts toward unlocking the next topic.

  **What earns a badge**: passing that subtopic's **Hard** quiz (same hint at line 259: "Pass Hard to earn the topic badge ⭐"). Badges are step-level (not per-subtopic) — earning one on any subtopic within a step marks that whole step as badge-earning, shown with a gold star badge on the step card (lines 325–327) and listed in the "Topic Badges" strip near the top of the page (lines 557–575).

**Shared plumbing, used by both modes:**
- **`ResourceCard`** — lines 30–76. Same idea as the one in the job-status page above: a clickable tile for a YouTube video or article link.
- **`ErrorState`** — lines 371–388 and **`LoadingState`** — lines 390–407. The "something broke" and "still loading" screens for this page specifically (note: this is a separate, near-identical copy of `ErrorState` from the other file, not a shared one).
- **`RoadmapContent`** — lines 410–654. The component that ties everything together: it decides `hasSubtopics`, computes overall progress (percentage complete, shown on a progress bar in the hero section), and renders the list of steps as either `SubtopicStepCard`s or `StepCard`s (lines 597–622) depending on that one rule. It also owns two pieces of data-sending logic:
  - **`startQuiz`** (a `useMutation`, lines 436–449) calls `getOrCreateSubtopicQuiz(...)` when a difficulty button is clicked, and on success redirects to `/quizzes/{quizId}` so the user can actually take the quiz.
  - **`flatMutation`** (a `useMutation`, lines 462–477) calls `updateRoadmapProgress(...)` when a flat-mode "Mark complete" button is toggled.
- **`RoadmapDisplay`** — lines 656–669. Does the actual data fetching: **`useQuery`** — lines 657–662, calling `getRoadmapById(roadmapId)`, with `refetchOnWindowFocus: true` so that if the user takes a quiz on another page and comes back, their newly-earned progress/badges show up without a manual refresh (no polling here, since nothing is running in the background — the data only changes when the user does something).
- **`ViewRoadmapPage`** (default export) — lines 671–678. The outermost wrapper; just reads the `roadmapId` from the URL and hands it to `RoadmapDisplay`.
