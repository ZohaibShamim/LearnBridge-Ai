# Frontend — Dashboard, Quizzes, and Settings Pages

## What this is

The dashboard is the summary screen a user sees first after logging in — it shows quick stats (how many roadmaps, how many quizzes done, overall progress) plus a couple of "at a glance" lists. The quiz pages let a user browse available quizzes, take one question-by-question, and see a graded results page afterward. The settings-family pages (account settings, change password, general settings) are where a user would normally manage their profile, password, and app preferences.

Important heads-up before reading further: the dashboard and all four quiz pages are **fully wired to the real backend** (real `useQuery`/`useMutation` calls, no hardcoded data). The three settings-family pages are **not** — they are UI-only stubs with no backend endpoint behind them at all, and the code itself says so in comments. Read the "real vs. placeholder" note in each section below before explaining a page out loud, so you don't accidentally tell the class a feature works when it's actually just a fake `setTimeout`.

## File by file

### `frontend/app/(with-sidebar)/dashboard/page.tsx`

**Real vs. placeholder: REAL.** This page calls `useQuery({ queryKey: ["dashboard"], queryFn: getDashboard })` (lines 53–56), where `getDashboard` is a real API call imported from `@/config/services/dashboard.service` (line 6). There is no mock data and nothing is commented out.

- `gradePill` — lines 18–24. Not a component, just a lookup table (a plain JavaScript object) that maps a letter grade (`A`, `B`, `C`, `D`, `F`) to a set of Tailwind CSS classes (colors) for the little grade badge shown in "Recent Quiz Activity." It's written as literal strings on purpose rather than built by gluing text together, because Tailwind can't detect class names that are constructed dynamically at runtime (a documented gotcha in this codebase — see `DESIGN.md`).
- `StatTile` — lines 26–47. A small reusable card: an icon in a colored circle, a title, a big number, and a subtitle underneath. It's used four times to show "Courses in Progress," "Quizzes Completed," "Overall Progress," and "Roadmaps."
- `DashboardPage` (the default export, the whole page) — lines 49–234. Fetches the dashboard data with `useQuery` (lines 53–56), then pulls out `stats`, `currentLearning` (in-progress roadmaps), and `recentActivity` (recent quiz attempts) from the response (lines 58–61). The page body has three parts:
  - **Welcome banner** — lines 70–85. Greets the user by first name (pulled from the Zustand auth store, line 51) and shows a different message depending on whether they have any roadmaps yet.
  - **Stats row** — lines 88–129. While loading, shows four pulsing gray placeholder boxes (a "skeleton" loading state, lines 89–93). If the fetch fails, shows a plain error message (lines 94–97). Once loaded, renders the four `StatTile`s with real numbers from the backend.
  - **Current Learning Path** — lines 133–195. Lists the user's in-progress roadmaps with a progress bar each. If there are none, it shows an empty-state message and an "Upload CV" button that sends the user to `/upload`. Clicking a roadmap navigates to `/roadmaps/[id]`.
  - **Recent Quiz Activity** — lines 197–229. Lists the user's most recent quiz attempts with date, score, and grade badge. If there are none, shows a "Take a quiz →" link to `/quizzes`.

### `frontend/app/(with-sidebar)/quizzes/page.tsx`

**Real vs. placeholder: REAL.** Two real backend calls: `useQuery({ queryKey: ["quizzes"], queryFn: getAllQuizzes })` (lines 257–260) and `useQuery({ queryKey: ["roadmaps"], queryFn: getRoadmaps })` (lines 262–265), both imported from real service files (lines 7–8). No mock data anywhere in this file.

- `QuizCard` — lines 32–81. One card in the quiz grid: a decorative gradient banner up top, the quiz title and description, three small stats (question count, estimated time, difficulty level), category/difficulty badges, and a "Start Quiz" button that navigates to that quiz's page.
- `QuizCardSkeleton` — lines 83–99. The gray pulsing placeholder shown in place of a `QuizCard` while quizzes are still loading.
- `GenerateQuizModal` — lines 102–251. A popup (modal) that lets the user generate a brand-new AI quiz on demand. It has a topic text field, clickable topic suggestions pulled from the user's saved roadmaps' skill tags (see below), a difficulty dropdown (easy/medium/hard/mixed), and a slider for how many questions (3–15). Submitting calls `generateQuiz(...)` as a real mutation (lines 118–127); on success it invalidates the quizzes list (so the new quiz shows up) and navigates straight to the new quiz's page.
- `QuizzesPage` (default export) — lines 253–338. Fetches quizzes and the user's roadmaps (described above), then builds a list of topic suggestions with `useMemo` (lines 270–279): it collects every tag and skill from the user's saved roadmaps into a set, and falls back to a hardcoded list of six generic topics (`DEFAULT_TOPICS`, lines 23–30) only if the user has no roadmaps yet — that fallback list is a reasonable default, not mock data standing in for a broken API call. The page then renders: a hero header with a "Generate New Quiz" button, and a grid of `QuizCard`s — with loading skeletons, an error empty-state, or a "no quizzes yet" empty-state depending on the query's status.

### `frontend/app/(with-sidebar)/quizzes/[quizId]/page.tsx`

**Real vs. placeholder: REAL.** Fetches the quiz with `useQuery({ queryKey: ["quiz", quizId], queryFn: () => getQuizById(quizId) })` (lines 36–40) and submits answers with a real mutation calling `submitQuiz(...)` (lines 54–65). Both come from `@/config/services/quiz.service` (line 19). No mock questions anywhere in this file.

This whole file is one component, `QuizTakerPage` (lines 31–387) — there are no smaller named sub-components, just different sections of JSX depending on state. Here's how the actual quiz-taking flow works:

- **How questions are shown.** `questionIndex` (line 45) tracks which question is currently on screen, starting at 0. `currentQuestion` (line 52) looks that question up from the fetched `questions` array. Only one question is shown at a time, with Next/Previous buttons (lines 78–83, rendered around lines 325–345) to move between them, plus a clickable grid of numbered buttons (lines 301–322) that lets the user jump directly to any question — green if it's already answered, blue if it's the current one, gray otherwise.
- **How answers are tracked.** `answers` (line 47) is an object mapping question index → the index of the option the user picked (e.g. `{0: 2, 1: 0}` means "question 0 → picked option 2"). Clicking an answer option calls `handleAnswerSelect` (lines 74–76), which just writes that one entry into the `answers` object — nothing is sent to the backend yet at this point, it's all still local state. A `Progress` bar and an "X/Y answered" counter (lines 240–248) are derived from how many keys are in `answers`.
- **The timer.** Once the user clicks "Start Quiz" (`quizStarted` becomes `true`), a `useEffect` (lines 68–72) starts a `setInterval` that increments `timeSpent` (in seconds) once every second — this is a plain browser timer, not tied to the backend.
- **What happens on submit.** The "Complete Quiz" button (lines 371–379) is disabled until every question has been answered (`isAllAnswered`, line 86). Clicking it builds an array of answers in question order — using `-1` for any question left unanswered, just in case (line 56) — and calls the real `submitQuiz(quizId, answersArray, timeSpent)` mutation. On success, it redirects to the results page with the returned `attemptId` in the URL (`/quizzes/[quizId]/results?attemptId=...`, line 60). If the submit request fails, an inline error message is shown instead (lines 62–64, 364–369) and the user can try again.
- Before the quiz starts, there's also a "start screen" (lines 126–212) showing the quiz title, description, four stat tiles (question count, estimated time, difficulty, "Graded"), and a short instructions list — this only turns into the actual question flow once "Start Quiz" is clicked.

### `frontend/app/(with-sidebar)/quizzes/[quizId]/results/page.tsx`

**Real vs. placeholder: REAL.** Fetches the graded attempt with `useQuery({ queryKey: ["quizAttempt", attemptId], queryFn: () => getAttempt(attemptId) })` (lines 81–85), where `attemptId` comes from the URL's query string (line 79) — the same ID the quiz-taking page redirected to after a real submit. `getAttempt` is imported from the real quiz service (line 6).

- `DIFF_ROWS` — lines 11–45. Not a component — a small fixed array describing how to style the "easy / medium / hard" breakdown cards (colors, star icons, gradient stops), again written as literal Tailwind classes rather than built dynamically, for the same reason as `gradePill` on the dashboard.
- `GradeIndicator` — lines 47–72. The big colored banner at the top showing the letter grade (A–F) in huge text, the percentage score, and an encouraging message that changes based on the grade (e.g. "Outstanding!" for an A, "Try again to strengthen your knowledge" for an F).
- `QuizResultsPage` (default export) — lines 74–281. How the score/pass-fail result is shown, step by step:
  - Fetches the attempt (described above); while loading shows a spinner, and if it fails or the attempt is missing shows an empty-state with a "Back to Quizzes" button (lines 89–114).
  - Pulls out the quiz, `timeSpent`, `totalQuestions`, and `correctAnswers` from the result (lines 116–119).
  - Computes a per-difficulty breakdown (`difficultyStats`, lines 128–137) by walking through every question in the quiz alongside the user's saved answers, and bucketing "correct" vs. "total" counts by whether each question was tagged easy/medium/hard. This math runs entirely in the browser using data that already came back from the one API call — it doesn't need a second backend request.
  - Renders, in order: the main result card with `GradeIndicator` and three stat tiles (correct answers, time spent, accuracy) (lines 154–185); a "Performance by Difficulty" card with one colored box per difficulty level and a progress bar (lines 188–208); an optional AI-written feedback paragraph if the backend sent one (lines 211–218); "Back to Quizzes" / "Retake Quiz" buttons (lines 221–228); and a full "Answer Review" list (lines 231–277) showing every question, what the user picked, whether it was right, the correct answer if they got it wrong, and an explanation if one exists.

### `frontend/app/(with-sidebar)/account-settings/page.tsx`

**Real vs. placeholder: STUB — this is NOT wired to the backend.** The file has a comment right at the top saying so explicitly (lines 8–10): *"no backend wiring exists for profile updates yet — this seeds from the real signed-in user and fakes the save with a toast. Do NOT add an API call here until a backend endpoint exists."* Be careful explaining this one in class — the page *looks* fully functional (it reads your real name/email and has a working "Save changes" button), but saving does nothing real.

- `AccountSettingsPage` (default export) — lines 11–129. On page load, a `useEffect` (lines 21–26) copies the user's real first name, last name, and email out of the Zustand auth store into local `useState` fields (lines 14–17) — so the form is pre-filled with genuine data. But the form fields are otherwise just plain editable text inputs with no validation. Submitting the form (`handleSave`, lines 34–42) does not call any API — it sets a `saving` flag to show a loading spinner on the button, waits 700 milliseconds with `setTimeout` to simulate a network delay, then just shows a "Profile saved" success toast. None of the edited values are ever sent anywhere or persisted; refreshing the page would lose any changes.

### `frontend/app/(with-sidebar)/change-password/page.tsx`

**Real vs. placeholder: STUB — this is NOT wired to the backend.** Same pattern as account settings, and again the file says so directly in a comment (lines 7–9): *"no backend endpoint exists for password change yet. Validation is real (client-side match + length), the 'update' is faked with a toast."*

- `PasswordField` — lines 12–51. A reusable password input with a show/hide eye-icon toggle (its own local `show` state, line 25), used three times below for current/new/confirm password.
- `ChangePasswordPage` (default export) — lines 53–178. Tracks `currentPassword`, `newPassword`, and `confirmPassword` as separate state (lines 54–56). The validation here is genuinely real and runs entirely in the browser: it checks all three fields are filled in, that the new password is at least 8 characters (`MIN_LENGTH`, line 10), and that the new/confirm passwords match (`handleSubmit`, lines 63–90) — with live inline feedback as you type (a green checkmark once the password is long enough, line 129–142; a red "passwords do not match" warning, lines 153–158). But once validation passes, there is still no API call: it just flips a `saving` flag, waits 700ms (again simulating a network request), clears the fields, and shows an "Password updated" success toast (lines 81–89). No password is actually changed on the backend.

### `frontend/app/(with-sidebar)/settings/page.tsx`

**Real vs. placeholder: STUB — this is NOT wired to the backend, and it's the least "real" of the three.** Unlike the other two settings pages, this one doesn't even fake a save with a toast — it's pure local UI state with no submit action at all. The file comment says so (lines 7–8): *"Local-only preferences surface — no backend persists these yet. Toggles are purely client state; do NOT wire an API here until an endpoint exists."*

- `Toggle` — lines 11–38. A reusable on/off switch (styled to look like a pill with a sliding knob), built as an accessible `role="switch"` button with `aria-checked` rather than a hidden checkbox — this matters if you're explaining accessibility, since it's one of the few genuinely accessible custom controls in this app.
- `SETTINGS`/data — `SECTIONS` (lines 43–73) and `DEFAULTS` (lines 75–84) aren't components either, just the fixed list of toggle rows (grouped into "Notifications," "Privacy," and "Appearance" sections) and their starting on/off values.
- `SettingsPage` (default export) — lines 86–128. Holds all toggle states in one `prefs` object (line 87), initialized from `DEFAULTS`. Clicking any `Toggle` just flips that one key in local state (`toggle`, line 88) — there's no save button, no API call, and nothing is persisted anywhere. Refreshing the page resets every toggle back to its default. It renders each section from `SECTIONS` as its own card, looping over that section's rows to render a `Toggle` for each (lines 99–125).
