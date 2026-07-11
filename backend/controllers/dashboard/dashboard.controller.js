import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { Roadmap } from "../../models/roadmap.schema.js";
import { QuizResult } from "../../models/quizResult.schema.js";

// GET /api/v1/dashboard
// Aggregates real progress + quiz data for the signed-in user (R1.11). No mock data.
export const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    return res
      .status(401)
      .json(new ApiResponse(401, null, "User not authenticated"));
  }

  const [roadmaps, quizResults] = await Promise.all([
    Roadmap.find({ userId }).sort({ createdAt: -1 }),
    QuizResult.find({ userId }).sort({ createdAt: -1 }),
  ]);

  // Per-roadmap progress (derive %; guard empty and stale indices).
  const currentLearning = roadmaps.map((r) => {
    const totalSteps = r.roadmap?.steps?.length || 0;
    // Only count completed indices that are still in range.
    const completedCount = (r.completedSteps || []).filter(
      (i) => i >= 0 && i < totalSteps
    ).length;
    const progress =
      totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
    return {
      _id: r._id,
      jobTitle: r.jobTitle,
      careerGoal: r.roadmap?.career_goal || "",
      totalSteps,
      completedCount,
      progress,
      tags: r.tags || [],
    };
  });

  const roadmapsCompleted = currentLearning.filter((c) => c.progress === 100).length;
  const coursesInProgress = currentLearning.filter(
    (c) => c.progress > 0 && c.progress < 100
  ).length;
  const overallProgress =
    currentLearning.length > 0
      ? Math.round(
          currentLearning.reduce((s, c) => s + c.progress, 0) / currentLearning.length
        )
      : 0;

  const quizzesCompleted = quizResults.length;
  const avgQuizScore =
    quizzesCompleted > 0
      ? Math.round(
          quizResults.reduce((s, q) => s + (q.percentage || 0), 0) / quizzesCompleted
        )
      : 0;

  // Recent activity: latest quiz attempts (title comes from the quiz reference; keep it light).
  const recentActivity = quizResults.slice(0, 6).map((q) => ({
    type: "quiz",
    score: q.score,
    total: q.total,
    percentage: Math.round(q.percentage || 0),
    grade: q.grade,
    date: q.createdAt,
  }));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        stats: {
          coursesInProgress,
          roadmapsCompleted,
          quizzesCompleted,
          avgQuizScore,
          overallProgress,
          totalRoadmaps: currentLearning.length,
        },
        currentLearning,
        recentActivity,
      },
      "Dashboard data retrieved"
    )
  );
});
