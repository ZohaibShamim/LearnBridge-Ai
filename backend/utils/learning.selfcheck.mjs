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

// Comprehensive topic quiz: passing it clears EVERY subtopic of the topic at once. Mirror
// that here (3 subtopics) and assert the next topic unlocks — the invariant the topic quiz relies on.
const rm2 = {
  roadmap: { steps: [
    { subtopics: [{ _id: "x1" }, { _id: "x2" }, { _id: "x3" }] },
    { subtopics: [{ _id: "y1" }] },
  ] },
  clearedSubtopics: [],
};
assert.strictEqual(isTopicUnlocked(rm2, 1), false);         // nothing cleared yet -> locked
// Simulate the combined-quiz effect: clear all three subtopics of topic 0.
rm2.roadmap.steps[0].subtopics.forEach((s) =>
  rm2.clearedSubtopics.push({ stepIndex: 0, subtopicId: s._id, difficulty: "medium" })
);
assert.strictEqual(isTopicUnlocked(rm2, 1), true);          // all of topic 0 cleared -> topic 1 open
assert.strictEqual(progressPercent(rm2), 75);              // 3 of 4 subtopics cleared

console.log("learning.js self-check OK");
