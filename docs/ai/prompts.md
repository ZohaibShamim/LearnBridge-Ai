# AI Service — Prompts (what we tell the AI model to do)

## What this is

A "prompt" (the block of text you send to an AI model as its instructions) is just a big string that tells the AI model exactly what to do and exactly what shape the answer must come back in. The three files below don't call the AI model themselves — they only *build* that instruction string, mixing in real data like the user's CV text or their target job role. That way, every request sent to the AI model is clear and consistent, instead of being a slightly different, randomly-worded request each time. Other code (the "AI service" logic) takes the string these functions return and actually sends it to the model.

## File by file

### `ai/app/utils/prompt.py`

#### `roadmap_prompt()` — lines 1–59

This is the main prompt — it builds the instructions used to generate the user's 12-month career roadmap.

**What goes in:**
- `cv_text` — the text pulled out of the user's uploaded CV (résumé).
- `role` (optional) — the target job role the user picked, e.g. `"software_engineer"`. This can be left empty if the user didn't choose a role.

**What it does with the role (the branch):**
- Lines 3–8 turn the short internal role codes (like `"data_scientist"`) into a readable name (like `"Data Scientist"`) using a lookup table.
- **If a role was picked** (lines 10–21): the prompt tells the AI model to look at the CV, figure out which of the user's current skills carry over to that role, and build the roadmap so it starts from what the user already knows and gradually introduces the new skills needed for that specific role.
- **If no role was picked** (line 23): the prompt instead asks the AI model to look at the CV on its own and suggest whatever career path fits the person's background best.

**What the AI model is asked to return:** Only a JSON object (a piece of structured, computer-readable data — no extra sentences, no formatting) shaped like this:
- `career_goal` — a specific goal statement matching the person's background and target role.
- `current_level` — a short summary of how skilled they already are.
- `estimated_timeline` — always `"12 months"`.
- `steps` — a list of exactly 12 entries, one per month. Each step has:
  - `month` — the month number.
  - `title` — a short name for that month's focus.
  - `description` — what to actually do that month.
  - `skills` — a list of 3 to 5 skills covered that month.
  - `subtopics` — 2 to 4 smaller sub-skills within that month, each with its own `title` and one-sentence `summary` (these exist so a quiz can later be generated about each one — see the quiz prompt below).

The prompt also tells the model that earlier months should lean on skills the person already has, later months should get more advanced, and that the reply must be pure JSON with no markdown code fences or explanations mixed in.

### `ai/app/utils/quiz_prompt.py`

#### `quiz_prompt()` — lines 1–45

This builds the instructions for generating a multiple-choice quiz on a given topic (used to test what the user has learned about a roadmap subtopic).

**What goes in:**
- `topic` — the subject to quiz on (e.g. one of the `subtopics` produced by the roadmap prompt above).
- `difficulty` — `"easy"`, `"medium"`, `"hard"`, or `"mixed"` (default).
- `num_questions` — how many questions to generate (default 5).

**The difficulty branch (lines 7–16):**
- If `difficulty` is `"mixed"`: the prompt asks for a rough even split — about a third easy, a third medium, a third hard — and each question must be labeled with which one it is.
- Otherwise (a specific difficulty was requested): every question must be that one difficulty, and each question must be labeled with that same difficulty.

**What the AI model is asked to return:** A JSON object shaped like this:
- `topic` — echoes back the topic that was quizzed.
- `questions` — a list of question objects, each with:
  - `question` — the actual question text, self-contained (understandable without needing extra context).
  - `options` — exactly 4 possible answers.
  - `correct_index` — which one of the 4 options (numbered 0 to 3) is correct.
  - `explanation` — a sentence or two on why that answer is right.
  - `difficulty` — `"easy"`, `"medium"`, or `"hard"` for that specific question.

The prompt also insists on exactly the requested number of questions, exactly one correct answer per question, no trick questions, and — same as the roadmap prompt — pure JSON with nothing else around it. A code comment in the file (lines 3–6) notes this JSON shape is deliberately built the same way as the roadmap prompt's, so the same parsing/safety-check code on the receiving end can handle both.

### `ai/app/utils/skill_prompt.py`

#### `skill_gap_prompt()` — lines 1–53

This builds the instructions for figuring out (a) what skills the user's CV already shows, (b) what skills their target role actually needs, and (c) which of those needed skills the user is missing — the "skill gap."

**What goes in:**
- `cv_text` — the CV text, same as the roadmap prompt.
- `role` (optional) — the target job role, using the same short codes as the roadmap prompt (turned into a readable name via the same lookup table, lines 7–12).

**The role branch:**
- **If a role was picked** (lines 14–29): the prompt asks the AI model to return three lists in one JSON object:
  - `extracted_skills` — skills that are genuinely shown in the CV text (only real evidence — tools, languages, frameworks, concepts actually mentioned; empty list if the CV is empty or unreadable).
  - `required_skills` — 8 to 12 of the most important skills someone actually needs for that target role.
  - `missing_skills` — whichever of the `required_skills` are *not* already covered by `extracted_skills` (in other words: required skills minus skills the person already has).
  - The prompt also tells the model to keep skill names short (like `"Python"` or `"Docker"`), not full sentences.
- **If no role was picked** (lines 31–43): the prompt still asks for the same three-field JSON shape, but tells the model to only fill in `extracted_skills` from the CV and leave `required_skills` and `missing_skills` as empty lists, since there's no target role to compare against.

A code comment (lines 3–6) explains this prompt is kept in its own file, separate from the roadmap prompt, specifically so that changes to one don't risk breaking the other — the roadmap prompt is called out as more "volatile" (more likely to be tweaked/experimented on) and the authors wanted to protect it from unrelated edits.

Same as the other two prompts, it ends by requiring pure JSON — no markdown, no extra commentary.
