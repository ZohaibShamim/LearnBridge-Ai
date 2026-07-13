# Guided Learning v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the flat 12-step roadmap into a guided learning journey — each topic gets AI subtopics, each subtopic has easy/medium/hard quizzes (lazy-generated + cached), passing Medium/Hard clears a subtopic, topics unlock in sequence, progress is quiz-driven, and passing Hard earns a per-topic badge.

**Architecture:** Additive across all three services. AI service: extend the roadmap prompt to emit `subtopics` per step + raise the Groq token ceiling. Backend: add linkage fields (`stepIndex`,`subtopicId`) to `Quiz`, pass/difficulty/linkage to `QuizResult`, and `clearedSubtopics`/`badges` to `Roadmap`; add a cached "get-or-create subtopic quiz" endpoint; wire `submitQuiz` to update roadmap progress + award badges on pass. Frontend: on the saved-roadmap detail page render subtopics with 3 difficulty launchers, lock states, subtopic-based progress bar, and a badges strip — reusing the existing quiz taker/results pages unchanged. Roadmaps without subtopics degrade to today's flat manual-toggle view.

**Tech Stack:** FastAPI/Python (AI), Express 5/Mongoose 9/BullMQ (backend), Next.js 16/React 19/TanStack Query/Tailwind v4 (frontend). No new dependencies.

## Global Constraints

- Pass threshold = **60%** (`percentage >= 60`). One constant, server-side only.
- Difficulty roles: **Easy = practice** (saved, never gates, never clears, never badges), **Medium = advance** (pass clears the subtopic + counts toward progress + unlocks), **Hard = advance + badge** (pass clears + awards the topic badge).
- A subtopic is **cleared** when its Medium **or** Hard quiz is passed. Progress% = clearedSubtopics ÷ totalSubtopics.
- Topic `i` is **unlocked** ⟺ `i == 0` OR every subtopic of topic `i-1` is cleared. Enforced in UI **and** server-side on quiz creation (403 if locked).
- Topic **badge** = first Hard pass on any subtopic in that topic (one ⭐ per topic, idempotent).
- Quiz generation is **lazy + cached**: cache key = `(userId, roadmapId, stepIndex, subtopicId, difficulty)`. Never pre-generate.
- Learning journey lives ONLY on the **saved** roadmap (`/roadmaps/:id`). Subtopic `_id`s exist only after save (Mongoose subdoc `_id`).
- Backward-compat: a roadmap where no step has subtopics renders exactly today's flat StepCard + manual `completedSteps` toggle. Do not break it.
- Match each service's existing error/response conventions (backend `ApiResponse`/`ApiError`; ownership → 403 not 404). No new `console.log`/`print` of PII.
- Reuse existing quiz taker (`/quizzes/:quizId`) and results (`/quizzes/:quizId/results`) pages as-is — do not fork them.

---

### Task 1: AI — emit subtopics per roadmap step

**Files:**
- Modify: `ai/app/utils/prompt.py:29-50` (schema block + rules)
- Modify: `ai/app/services/ai_service.py:144` (Groq `max_tokens`), `:148` (Groq timeout)

**Interfaces:**
- Produces: each `steps[i]` now also carries `subtopics: [{ "title": str, "summary": str }]`, 2–4 entries.

- [ ] **Step 1: Add `subtopics` to the prompt's JSON schema block**

In `roadmap_prompt`, change the `steps` example object to:
```python
  "steps": [
    {{
      "month": 1,
      "title": "Step title",
      "description": "Detailed description of what to do this month, referencing their existing skills where relevant",
      "skills": ["skill1", "skill2", "skill3"],
      "subtopics": [
        {{ "title": "A focused sub-skill within this month", "summary": "One sentence on what the learner studies here" }}
      ]
    }}
  ]
```

- [ ] **Step 2: Add subtopic rules to the Rules list**

Add these two bullets to the `Rules:` block:
```
- Each step must have 2 to 4 subtopics that break the month's title into concrete, quizzable sub-skills.
- Each subtopic needs a short "title" and a one-sentence "summary". Subtopics must be specific enough to write a focused quiz on.
```

- [ ] **Step 3: Raise the Groq token ceiling + timeout** (subtopics enlarge the JSON — 2000 truncates it into invalid JSON)

`ai_service.py:144` `"max_tokens": 2000` → `"max_tokens": 4000`. `ai_service.py:148` `timeout=30` → `timeout=60`.

- [ ] **Step 4: Manual verify against the running service**

Run (AI service up on 8001):
```bash
curl -s -X POST http://localhost:8001/ai/roadmap \
  -H "Content-Type: application/json" \
  -d '{"job_id":"t1","cv_text":"Frontend dev, 3y React, some Node. Wants ML.","role":"machine_learning"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); s=d['roadmap']['steps']; print('steps',len(s)); print('subtopics[0]',len(s[0].get('subtopics',[]))); print(s[0]['subtopics'][0])"
```
Expected: `steps 12`, `subtopics[0]` between 2 and 4, and a `{title, summary}` dict printed. If it prints a JSON error, the token bump didn't take or the model truncated — re-check Step 3.

- [ ] **Step 5: Commit**
```bash
git add ai/app/utils/prompt.py ai/app/services/ai_service.py
git commit -m "FEATURE(ai): emit 2-4 subtopics per roadmap step; raise Groq token ceiling"
```

---

### Task 2: Backend — schema additions (Quiz, QuizResult, Roadmap)

**Files:**
- Modify: `backend/models/quiz.schema.js:27-55` (add `stepIndex`, `subtopicId`)
- Modify: `backend/models/quizResult.schema.js:13-33` (add `passed`, `difficulty`, `roadmapId`, `stepIndex`, `subtopicId`, `badgeAwarded`)
- Modify: `backend/models/roadmap.schema.js:3-26` (add `subtopics` to `stepSchema`), `:28-80` (add `clearedSubtopics`, `badges`)

**Interfaces:**
- Produces: `Quiz.stepIndex:Number`, `Quiz.subtopicId:String`; `QuizResult.passed:Boolean`, `.difficulty:String`, `.roadmapId:ObjectId`, `.stepIndex:Number`, `.subtopicId:String`, `.badgeAwarded:Boolean`; `Roadmap.roadmap.steps[i].subtopics:[{_id, title, summary}]`, `Roadmap.clearedSubtopics:[{stepIndex,subtopicId,difficulty}]`, `Roadmap.badges:[{stepIndex,title,earnedAt}]`.

- [ ] **Step 1: Add subtopic subdoc + arrays to `roadmap.schema.js`**

Above `stepSchema`, add (subtopics KEEP their `_id` — it's the stable linkage key):
```js
const subtopicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  summary: { type: String },
});
```
Inside `stepSchema`, after `resources`, add: `subtopics: [subtopicSchema],`
Inside `roadmapSchema`, after `completedSteps`, add:
```js
  // Quiz-driven progress: a subtopic is "cleared" when its medium or hard quiz is passed.
  clearedSubtopics: [
    {
      stepIndex: { type: Number, required: true },
      subtopicId: { type: String, required: true },
      difficulty: { type: String, enum: ["medium", "hard"], required: true },
    },
  ],
  // One badge per topic, awarded the first time a HARD subtopic quiz in that topic is passed.
  badges: [
    {
      stepIndex: { type: Number, required: true },
      title: { type: String, required: true },
      earnedAt: { type: Date, default: Date.now },
    },
  ],
```

- [ ] **Step 2: Add linkage to `quiz.schema.js`** (after `roadmapId`, before `title`):
```js
    // Set only for roadmap subtopic quizzes. Together with roadmapId+difficulty these form the
    // lazy-generation cache key so a given (user, roadmap, step, subtopic, difficulty) reuses one quiz.
    stepIndex: { type: Number },
    subtopicId: { type: String },
```

- [ ] **Step 3: Add result fields to `quizResult.schema.js`** (after `grade`):
```js
    passed: { type: Boolean, default: false },
    difficulty: { type: String, enum: ["easy", "medium", "hard", "mixed"] },
    // Roadmap linkage copied from the quiz at submit time, so progress/badges are queryable from results.
    roadmapId: { type: mongoose.Schema.Types.ObjectId, ref: "Roadmap" },
    stepIndex: { type: Number },
    subtopicId: { type: String },
    badgeAwarded: { type: Boolean, default: false },
```

- [ ] **Step 4: Sanity-check models load** (no test framework change; just import):
```bash
cd backend && node -e "import('./models/roadmap.schema.js').then(()=>import('./models/quiz.schema.js')).then(()=>import('./models/quizResult.schema.js')).then(()=>console.log('models OK')).catch(e=>{console.error(e);process.exit(1)})"
```
Expected: `models OK`.

- [ ] **Step 5: Commit**
```bash
git add backend/models/roadmap.schema.js backend/models/quiz.schema.js backend/models/quizResult.schema.js
git commit -m "FEATURE(backend): schema for subtopics, quiz->subtopic linkage, cleared-subtopics + badges"
```

---

### Task 3: Backend — shared gating/progress helpers

**Files:**
- Create: `backend/utils/learning.js`

**Interfaces:**
- Produces:
  - `PASS_THRESHOLD = 60`
  - `totalSubtopics(roadmapDoc) -> number`
  - `isSubtopicCleared(roadmapDoc, stepIndex, subtopicId) -> boolean`
  - `isTopicUnlocked(roadmapDoc, stepIndex) -> boolean` (step 0 always unlocked; else all subtopics of `stepIndex-1` cleared)
  - `progressPercent(roadmapDoc) -> number` (0..100, rounded)

- [ ] **Step 1: Write the helper module**
```js
// Shared learning-progress logic for the subtopic/quiz/badge system. Kept in one place so the
// quiz controller and any future dashboard aggregation compute gating/progress identically.
export const PASS_THRESHOLD = 60;

const stepsOf = (roadmapDoc) => roadmapDoc?.roadmap?.steps || [];

export function totalSubtopics(roadmapDoc) {
  return stepsOf(roadmapDoc).reduce((sum, s) => sum + (s.subtopics?.length || 0), 0);
}

export function isSubtopicCleared(roadmapDoc, stepIndex, subtopicId) {
  return (roadmapDoc.clearedSubtopics || []).some(
    (c) => c.stepIndex === stepIndex && c.subtopicId === String(subtopicId)
  );
}

export function isTopicUnlocked(roadmapDoc, stepIndex) {
  if (stepIndex <= 0) return true;
  const prev = stepsOf(roadmapDoc)[stepIndex - 1];
  if (!prev || !(prev.subtopics?.length)) return true; // nothing to clear on the previous topic
  return prev.subtopics.every((sub) => isSubtopicCleared(roadmapDoc, stepIndex - 1, sub._id));
}

export function progressPercent(roadmapDoc) {
  const total = totalSubtopics(roadmapDoc);
  if (total === 0) return 0;
  const cleared = (roadmapDoc.clearedSubtopics || []).length;
  return Math.round((cleared / total) * 100);
}
```

- [ ] **Step 2: Add a runnable self-check** (ponytail: non-trivial gating logic gets one check)

Create `backend/utils/learning.selfcheck.mjs`:
```js
import assert from "node:assert";
import { totalSubtopics, isTopicUnlocked, isSubtopicCleared, progressPercent } from "./learning.js";

const rm = {
  roadmap: { steps: [
    { subtopics: [{ _id: "a1" }, { _id: "a2" }] },
    { subtopics: [{ _id: "b1" }] },
  ] },
  clearedSubtopics: [{ stepIndex: 0, subtopicId: "a1", difficulty: "medium" }],
};
assert.strictEqual(totalSubtopics(rm), 3);
assert.strictEqual(isTopicUnlocked(rm, 0), true);           // first topic always open
assert.strictEqual(isTopicUnlocked(rm, 1), false);          // a2 not cleared yet
assert.strictEqual(isSubtopicCleared(rm, 0, "a1"), true);
assert.strictEqual(progressPercent(rm), 33);                // 1/3
rm.clearedSubtopics.push({ stepIndex: 0, subtopicId: "a2", difficulty: "hard" });
assert.strictEqual(isTopicUnlocked(rm, 1), true);           // both of topic 0 cleared -> topic 1 open
console.log("learning.js self-check OK");
```
Run: `cd backend && node utils/learning.selfcheck.mjs` → Expected: `learning.js self-check OK`.

- [ ] **Step 3: Commit**
```bash
git add backend/utils/learning.js backend/utils/learning.selfcheck.mjs
git commit -m "FEATURE(backend): shared learning gating/progress helpers + self-check"
```

---

### Task 4: Backend — cached get-or-create subtopic quiz endpoint

**Files:**
- Modify: `backend/controllers/quizzes/quizzes.controller.js` (import Roadmap + helpers; add `getOrCreateSubtopicQuiz`)
- Modify: `backend/routes/quiz.routes.js` (mount the new route before `/:quizId`)

**Interfaces:**
- Consumes: Task 2 fields, Task 3 helpers (`isTopicUnlocked`), existing `aiClient`, `toSafeQuiz`.
- Produces: `POST /api/v1/quizzes/subtopic` body `{ roadmapId, stepIndex, subtopicId, difficulty }` → `ApiResponse<SafeQuiz>` (201 new / 200 cached). 403 if the topic is locked, 404 on bad ids, 400 on bad difficulty.

- [ ] **Step 1: Add imports at top of `quizzes.controller.js`**
```js
import { Roadmap } from "../../models/roadmap.schema.js";
import { isTopicUnlocked } from "../../utils/learning.js";
```

- [ ] **Step 2: Add the controller** (after `generateQuiz`)
```js
// POST /api/v1/quizzes/subtopic  { roadmapId, stepIndex, subtopicId, difficulty }
// Lazily generate (or return the cached) quiz for one roadmap subtopic at a fixed difficulty.
export const getOrCreateSubtopicQuiz = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { roadmapId, stepIndex, subtopicId, difficulty } = req.body;

  const idx = Number(stepIndex);
  if (!roadmapId || !Number.isInteger(idx) || idx < 0 || !subtopicId) {
    throw new ApiError(400, "roadmapId, stepIndex and subtopicId are required");
  }
  if (!["easy", "medium", "hard"].includes(difficulty)) {
    throw new ApiError(400, "difficulty must be easy, medium or hard");
  }

  const roadmap = await Roadmap.findById(roadmapId);
  if (!roadmap) throw new ApiError(404, "Roadmap not found");
  if (roadmap.userId.toString() !== userId.toString()) {
    throw new ApiError(403, "You don't have access to this roadmap");
  }

  const step = roadmap.roadmap?.steps?.[idx];
  const subtopic = step?.subtopics?.id(subtopicId);
  if (!step || !subtopic) throw new ApiError(404, "Subtopic not found on this roadmap");

  // Gate: the topic must be unlocked (all subtopics of the previous topic cleared).
  if (!isTopicUnlocked(roadmap, idx)) {
    throw new ApiError(403, "Complete the previous topic before starting this one");
  }

  // Cache: reuse an existing quiz for this exact (user, roadmap, step, subtopic, difficulty).
  const existing = await Quiz.findOne({
    userId, roadmapId, stepIndex: idx, subtopicId: String(subtopicId), difficulty,
  });
  if (existing) {
    return res.status(200).json(new ApiResponse(200, toSafeQuiz(existing), "Quiz ready"));
  }

  const topicLabel = `${step.title} — ${subtopic.title}`;
  let aiResponse;
  try {
    aiResponse = await aiClient.post("/ai/quiz", {
      topic: `${topicLabel}: ${subtopic.summary || subtopic.title}`,
      difficulty,
      num_questions: 5,
    });
  } catch (err) {
    if (err?.response?.status === 422) throw new ApiError(400, "Invalid subtopic for quiz generation");
    throw new ApiError(502, "Quiz generation service is unavailable. Please try again.");
  }

  const questions = (aiResponse.data?.questions || []).map((q) => ({
    question: q.question,
    options: q.options,
    correctIndex: q.correct_index,
    explanation: q.explanation,
    difficulty: q.difficulty || difficulty,
  }));
  if (questions.length === 0) {
    throw new ApiError(502, "Quiz generation returned no valid questions. Please try again.");
  }

  const quiz = await Quiz.create({
    userId,
    roadmapId,
    stepIndex: idx,
    subtopicId: String(subtopicId),
    title: `${topicLabel} (${difficulty})`,
    description: `Test your knowledge of ${subtopic.title}.`,
    category: step.title,
    topic: topicLabel,
    difficulty,
    estimatedTime: Math.ceil(questions.length * 1.5),
    questions,
  });

  return res.status(201).json(new ApiResponse(201, toSafeQuiz(quiz), "Quiz generated"));
});
```

- [ ] **Step 3: Wire the route** in `quiz.routes.js` — add import `getOrCreateSubtopicQuiz` and, BEFORE `router.get("/:quizId", ...)`:
```js
router.post("/subtopic", getOrCreateSubtopicQuiz);
```

- [ ] **Step 4: Live-verify** (after full stack is up — done in Task 8; for now just confirm the server boots): `cd backend && npm run dev` starts with no import errors, then Ctrl-C.

- [ ] **Step 5: Commit**
```bash
git add backend/controllers/quizzes/quizzes.controller.js backend/routes/quiz.routes.js
git commit -m "FEATURE(backend): cached get-or-create subtopic quiz endpoint with topic gating"
```

---

### Task 5: Backend — wire submitQuiz to progress + badges

**Files:**
- Modify: `backend/controllers/quizzes/quizzes.controller.js:167-216` (`submitQuiz`)

**Interfaces:**
- Consumes: `PASS_THRESHOLD` from Task 3, the linkage fields on `Quiz`/`QuizResult`.
- Produces: submit response gains `passed:boolean`, `badgeAwarded:boolean`, `progress:number|null`. `QuizResult` rows now persist `passed`,`difficulty`,`roadmapId`,`stepIndex`,`subtopicId`,`badgeAwarded`.

- [ ] **Step 1: Import the threshold** — add `PASS_THRESHOLD` to the `learning.js` import at the top:
```js
import { isTopicUnlocked, PASS_THRESHOLD, progressPercent } from "../../utils/learning.js";
```

- [ ] **Step 2: After computing `grade` (line ~199), compute pass + roadmap effects** — replace the `QuizResult.create({...})` block through the response with:
```js
  const passed = percentage >= PASS_THRESHOLD;

  // Roadmap effects only for subtopic quizzes that were passed at medium/hard.
  let badgeAwarded = false;
  let progress = null;
  if (passed && quiz.roadmapId && quiz.subtopicId != null && ["medium", "hard"].includes(quiz.difficulty)) {
    const roadmap = await Roadmap.findById(quiz.roadmapId);
    if (roadmap && roadmap.userId.toString() === userId.toString()) {
      const sIdx = quiz.stepIndex;

      // Clear the subtopic (idempotent; upgrade difficulty to hard if it was medium before).
      const existingClear = roadmap.clearedSubtopics.find(
        (c) => c.stepIndex === sIdx && c.subtopicId === quiz.subtopicId
      );
      if (existingClear) {
        if (quiz.difficulty === "hard") existingClear.difficulty = "hard";
      } else {
        roadmap.clearedSubtopics.push({ stepIndex: sIdx, subtopicId: quiz.subtopicId, difficulty: quiz.difficulty });
      }

      // Badge: first hard pass anywhere in this topic.
      if (quiz.difficulty === "hard" && !roadmap.badges.some((b) => b.stepIndex === sIdx)) {
        const stepTitle = roadmap.roadmap?.steps?.[sIdx]?.title || `Topic ${sIdx + 1}`;
        roadmap.badges.push({ stepIndex: sIdx, title: stepTitle });
        badgeAwarded = true;
      }

      await roadmap.save();
      progress = progressPercent(roadmap);
    }
  }

  const result = await QuizResult.create({
    userId,
    quizId: quiz._id,
    answers: graded,
    score,
    total,
    percentage,
    grade,
    passed,
    difficulty: quiz.difficulty,
    roadmapId: quiz.roadmapId,
    stepIndex: quiz.stepIndex,
    subtopicId: quiz.subtopicId,
    badgeAwarded,
    timeSpent: Number(timeSpent) || 0,
    feedback: feedbackFor(grade),
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      { attemptId: result._id, score, total, percentage, grade, passed, badgeAwarded, progress },
      "Quiz submitted"
    )
  );
```

- [ ] **Step 3: Add `passed`/`badgeAwarded`/`difficulty` to the `getAttempt` response** (`quizzes.controller.js` getAttempt, inside the returned object) so the results page can celebrate:
```js
        passed: result.passed,
        badgeAwarded: result.badgeAwarded,
        difficulty: result.difficulty,
```

- [ ] **Step 4: Live-verify in Task 8.** For now: `cd backend && npm run dev` boots clean, Ctrl-C.

- [ ] **Step 5: Commit**
```bash
git add backend/controllers/quizzes/quizzes.controller.js
git commit -m "FEATURE(backend): submitQuiz clears subtopics, awards topic badges, returns pass/progress"
```

---

### Task 6: Frontend — types + service methods

**Files:**
- Modify: `frontend/config/services/cv.service.ts:24-31` (add `subtopics` to `RoadmapStep`)
- Modify: `frontend/config/services/roadmap.service.ts:4-25` (add `clearedSubtopics`,`badges` to `SavedRoadmap`)
- Modify: `frontend/config/services/quiz.service.ts` (add `getOrCreateSubtopicQuiz`; extend `SubmitResult` + `AttemptResult`)

**Interfaces:**
- Produces: TS types `Subtopic`, `ClearedSubtopic`, `Badge`; `getOrCreateSubtopicQuiz(payload)`.

- [ ] **Step 1: `cv.service.ts` — subtopic type + field**
```ts
export interface Subtopic {
  _id: string;
  title: string;
  summary?: string;
}
```
Add to `RoadmapStep`: `subtopics?: Subtopic[];`

- [ ] **Step 2: `roadmap.service.ts` — progress/badge fields on `SavedRoadmap`**
```ts
export interface ClearedSubtopic {
  stepIndex: number;
  subtopicId: string;
  difficulty: "medium" | "hard";
}
export interface Badge {
  stepIndex: number;
  title: string;
  earnedAt: string;
}
```
Add to `SavedRoadmap`: `clearedSubtopics?: ClearedSubtopic[];` and `badges?: Badge[];`

- [ ] **Step 3: `quiz.service.ts` — new method + extended results**

Add to `SubmitResult`: `passed?: boolean; badgeAwarded?: boolean; progress?: number | null;`
Add to `AttemptResult`: `passed?: boolean; badgeAwarded?: boolean; difficulty?: QuizDifficulty;`
Add method:
```ts
export interface SubtopicQuizPayload {
  roadmapId: string;
  stepIndex: number;
  subtopicId: string;
  difficulty: Difficulty;
}

export const getOrCreateSubtopicQuiz = async (
  payload: SubtopicQuizPayload
): Promise<ApiResponse<Quiz>> => {
  const response = await api.post<ApiResponse<Quiz>>("/quizzes/subtopic", payload);
  return response.data;
};
```

- [ ] **Step 4: Typecheck** — `cd frontend && npx tsc --noEmit` → Expected: no new errors in these three files.

- [ ] **Step 5: Commit**
```bash
git add frontend/config/services/cv.service.ts frontend/config/services/roadmap.service.ts frontend/config/services/quiz.service.ts
git commit -m "FEATURE(frontend): types + service for subtopics, subtopic quizzes, badges"
```

---

### Task 7: Frontend — subtopic learning UI on the saved roadmap page

**Files:**
- Modify: `frontend/app/(with-sidebar)/roadmaps/[roadmapId]/page.tsx`

**Interfaces:**
- Consumes: `getOrCreateSubtopicQuiz`, `SavedRoadmap.clearedSubtopics/badges`, `RoadmapStep.subtopics`, the shared learning gating logic (recomputed client-side).

Design (matches DESIGN.md vocabulary — no new button family; difficulty colors via a LITERAL lookup map, never interpolated Tailwind):

- [ ] **Step 1: Add a `SubtopicRow` + difficulty-launcher component.** For each subtopic show its title/summary and three buttons (Easy/Medium/Hard). Clicking calls `getOrCreateSubtopicQuiz` then `router.push('/quizzes/'+quizId)`. Difficulty color map (literal strings):
```ts
const DIFF_STYLES: Record<"easy" | "medium" | "hard", string> = {
  easy: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  medium: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
  hard: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
};
```
A subtopic shows a ✓ "Cleared" pill when it's in `clearedSubtopics`; the Hard button shows a ⭐ hint "Pass to earn the topic badge" (badge criteria visible BEFORE the attempt — research requirement).

- [ ] **Step 2: Gating.** Compute `clearedSet` from `roadmap.clearedSubtopics` and `topicUnlocked(index)` (step 0 open; else all subtopics of `index-1` cleared). Locked topics render subtopics greyed with a lock icon + "Complete {previous topic} to unlock" and disabled buttons.

- [ ] **Step 3: Progress = subtopic-based when subtopics exist.** Compute `hasSubtopics = steps.some(s => s.subtopics?.length)`. When true: `totalSubtopics`/`clearedCount`, `percentage = round(cleared/total*100)`, and the hero bar reads `{cleared} of {total} subtopics · {percentage}%`. When false: keep today's `completedSteps` behavior unchanged (early branch).

- [ ] **Step 4: Badges strip.** Below the hero, when `roadmap.badges?.length`, render a row of ⭐ pills (`badge.title`). When `hasSubtopics` and no badges yet, show a muted hint "Pass a Hard quiz to earn your first topic badge."

- [ ] **Step 5: Refresh after returning from a quiz.** The page already uses `useQuery(["roadmap", roadmapId])`. Ensure it refetches on window focus (TanStack default) OR invalidate on mount so progress/badges update when the user comes back from results. Add `refetchOnWindowFocus: true` to that query.

- [ ] **Step 6: Keep the flat fallback.** When `!hasSubtopics`, render the existing `StepCard` with the manual toggle (unchanged). When `hasSubtopics`, render the new subtopic UI inside each expanded step and DROP the manual "Mark complete" button (progress is quiz-driven now).

- [ ] **Step 7: Live-verify in Task 8.** Typecheck now: `cd frontend && npx tsc --noEmit`.

- [ ] **Step 8: Commit**
```bash
git add "frontend/app/(with-sidebar)/roadmaps/[roadmapId]/page.tsx"
git commit -m "FEATURE(frontend): subtopic quizzes, difficulty launchers, locks, quiz-driven progress, badges"
```

---

### Task 8: Live pipeline test (claude-in-chrome, browser 1) + results banner polish

**Files:**
- Modify (small): `frontend/app/(with-sidebar)/quizzes/[quizId]/results/page.tsx` (pass/fail + badge banner from the extended `AttemptResult`) — only if the existing page doesn't already surface it.

- [ ] **Step 1: Start all four processes + confirm Redis/Mongo** (ports per each service's run config; backend port from `backend/.env`):
  - `cd ai && python run.py` (8001)
  - `cd backend && npm run dev`
  - `cd backend && node workers/cv.worker.js`
  - `cd frontend && npm run dev` (3000)
  Confirm `frontend/.env.local` `NEXT_PUBLIC_API_BASE_URL` matches the backend port.

- [ ] **Step 2: Golden path in browser 1** — register → OTP (read from backend console) → login → upload CV (pick a role) → wait for job `completed` → save roadmap → open it from `/roadmaps`.
- [ ] **Step 3:** Verify each topic shows 2–4 subtopics; topic 1 open, topic 2 locked.
- [ ] **Step 4:** On a topic-1 subtopic click **Easy** → take → submit. Confirm it does NOT clear the subtopic or move progress (practice).
- [ ] **Step 5:** Click **Medium**, pass (≥60%) → subtopic shows ✓ Cleared, progress bar moves. Fail once first to confirm it does NOT clear.
- [ ] **Step 6:** Clear ALL subtopics of topic 1 at Medium → confirm topic 2 unlocks.
- [ ] **Step 7:** Pass a **Hard** quiz on a topic-1 subtopic → confirm a ⭐ badge for that topic appears (strip + results banner) and a second hard pass in the same topic does NOT duplicate the badge.
- [ ] **Step 8:** Open an OLD roadmap (no subtopics) → confirm it still renders the flat manual-toggle view unchanged.
- [ ] **Step 9:** Watch the network tab: re-opening the same subtopic+difficulty reuses the cached quiz (200, no new AI call / same quizId).
- [ ] **Step 10: Commit any polish** and push branch, open PR to `main`.

---

## Self-Review

**Spec coverage:**
- Subtopics per topic → Task 1 (AI), Task 2 (schema), Task 6/7 (UI). ✓
- Per-subtopic quiz, easy/medium/hard → Task 4 (endpoint), Task 7 (launchers). ✓
- Pass ≥ medium to proceed / topic unlock → Task 3 (`isTopicUnlocked`), Task 4 (server gate), Task 7 (UI locks). ✓
- Progress from quizzes passed → Task 3 (`progressPercent`), Task 5 (write path), Task 7 (bar). ✓
- Badge on hard pass → Task 5 (award), Task 7 (strip), Task 8 (results banner). ✓
- Lazy + cached generation → Task 4 (cache lookup). ✓
- Backward-compat flat view → Task 7 Step 6, Task 8 Step 8. ✓
- Live pipeline test on browser 1 → Task 8. ✓

**Type consistency:** `stepIndex`/`subtopicId`/`difficulty` names identical across Quiz, QuizResult, learning.js, endpoint, and frontend payload. Cache key tuple identical in Task 4 (create + findOne). `clearedSubtopics` shape `{stepIndex,subtopicId,difficulty}` identical in schema (Task 2), helper (Task 3), and write path (Task 5).

**Placeholder scan:** none — every step has concrete code or a concrete command.

**Known deferrals (flagged, not gaps):** AI `RoadmapResponse` pydantic model + narrowed error codes (AI CLAUDE.md §4) deferred — subtopics flow through the untyped path today; list-endpoint pagination for the multiplied quiz rows deferred; fresh `/roadmap/[jobId]` pre-save view left flat (subtopics have no `_id` before save).
