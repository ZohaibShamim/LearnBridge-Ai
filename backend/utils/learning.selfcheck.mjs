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
