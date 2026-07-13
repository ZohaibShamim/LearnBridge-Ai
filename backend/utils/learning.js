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
