import Link from "next/link";
import Image from "next/image";
import {
  Brain,
  BookOpen,
  FileText,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md shadow-sm fixed w-full z-20">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-xl text-sky-900"
        >
          <Brain className="h-6 w-6 text-sky-700" />
          LearnBridge-AI
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="#paths"
            className="text-sky-900 hover:text-sky-700 font-medium transition"
          >
            Learning Paths
          </Link>
          <Link
            href="#features"
            className="text-sky-900 hover:text-sky-700 font-medium transition"
          >
            Features
          </Link>
          <Link
            href="#cta"
            className="text-sky-900 hover:text-sky-700 font-medium transition"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg border border-sky-900 text-sky-900 hover:bg-sky-900 hover:text-white transition font-medium"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 rounded-lg bg-sky-900 text-white hover:bg-sky-800 transition font-medium"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-24">
        <Image
          src="/images/hero-cover.jpg"
          alt="Students learning AI and technology"
          fill
          className="object-cover z-0"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-sky-900/90 via-sky-800/70 to-transparent z-10" />
        <div className="relative z-20 flex flex-col items-start max-w-2xl px-6">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white">
            <Brain className="h-4 w-4" />
            AI-Powered Learning Platform
          </div>
          <h1 className="mb-6 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white">
            Master AI & Tech Skills with{" "}
            <span className="text-sky-300">LearnBridge-AI</span>
          </h1>
          <p className="mb-10 max-w-xl text-lg text-white/90">
            Your personalized learning companion for Artificial Intelligence,
            Machine Learning, Data Science, and Software Engineering. Get custom
            roadmaps, resume analysis, and track your progress.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/signup"
              className="h-12 px-8 text-base bg-white text-sky-900 rounded-lg font-semibold flex items-center justify-center hover:bg-white/90 transition"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="h-12 px-8 text-base border border-white text-white bg-transparent rounded-lg font-semibold flex items-center justify-center hover:bg-white/10 transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Course Categories Section */}
      <section id="paths" className="px-4 py-20 bg-secondary/30">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl md:text-4xl font-bold text-gray-900">
              Explore Learning Paths
            </h2>
            <p className="mx-auto max-w-2xl text-gray-600">
              Choose your journey and master in-demand tech skills
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            <CourseCategory
              image="/images/ai-learning.jpg"
              title="Artificial Intelligence"
              description="Neural networks, deep learning, and AI applications"
            />
            <CourseCategory
              image="/images/machine-learning.jpg"
              title="Machine Learning"
              description="Algorithms, model training, and predictive analytics"
            />
            <CourseCategory
              image="/images/data-science.jpg"
              title="Data Science"
              description="Data analysis, visualization, and insights"
            />
            <CourseCategory
              image="/images/data-science.jpg"
              title="Software Engineering"
              description="Data analysis, visualization, and insights"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl md:text-4xl font-bold text-gray-900">
              Everything You Need to Succeed
            </h2>
            <p className="mx-auto max-w-2xl text-gray-600">
              Our AI-driven platform provides personalized tools to accelerate
              your tech career
            </p>
          </div>
          <div className="space-y-10">
            {/* Top Row: 3 Cards */}
            <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={<Target className="h-8 w-8" />}
                title="Personalized Roadmaps"
                description="Get AI-generated learning paths tailored to your goals in AI, ML, Data Science, or Software Engineering."
                image="/images/roadmap.jpg"
              />
              <FeatureCard
                icon={<FileText className="h-8 w-8" />}
                title="Resume Analysis"
                description="Upload your resume and receive detailed skill gap analysis with actionable improvement suggestions."
                image="/images/resume-analysis.jpg"
              />
              <FeatureCard
                icon={<BookOpen className="h-8 w-8" />}
                title="Interactive Quizzes"
                description="Test your knowledge with adaptive quizzes that adjust to your skill level and learning pace."
                image="/images/quiz-learning.jpg"
              />
            </div>
            {/* Bottom Row: 2 Cards Centered */}
            <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-center lg:gap-16 lg:px-32">
              <FeatureCard
                icon={<TrendingUp className="h-8 w-8" />}
                title="Progress Tracking"
                description="Monitor your learning journey with visual dashboards and achievement milestones."
                image="/images/progress-tracking.jpg"
              />
              <FeatureCard
                icon={<Brain className="h-8 w-8" />}
                title="AI Recommendations"
                description="Receive intelligent suggestions for courses, projects, and resources based on your progress."
                image="/images/ai-learning.jpg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="px-4 py-20">
        <div className="mx-auto max-w-4xl rounded-2xl bg-sky-900 p-8 text-center md:p-16">
          <h2 className="mb-4 text-3xl md:text-4xl font-bold text-white">
            Ready to Start Your Learning Journey?
          </h2>
          <p className="mb-8 text-white/90">
            Join thousands of students already using LearnBridge-AI to
            accelerate their careers.
          </p>
          <Link
            href="/signup"
            className="h-12 px-8 text-base bg-white text-sky-900 rounded-lg font-semibold flex items-center justify-center hover:bg-white/90 transition"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-4 py-8 bg-white/80">
        <div className="mx-auto max-w-6xl text-center text-sm text-gray-500">
          <p>
            © 2026 LearnBridge-AI. Final Year Project - AI-Driven Learning
            Platform.
          </p>
        </div>
      </footer>
    </div>
  );
}

function CourseCategory({
  image,
  title,
  description,
}: {
  image: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-lg">
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={image || "/placeholder.svg"}
          alt={title}
          fill
          className="object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <h3 className="absolute bottom-4 left-4 text-xl font-bold text-white">
          {title}
        </h3>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  image,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  image?: string;
}) {
  return (
    <div className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {image && (
        <div className="relative h-36 overflow-hidden">
          <Image
            src={image || "/placeholder.svg"}
            alt={title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-6">
        <div className="mb-4 inline-flex rounded-lg bg-sky-100 p-3 text-sky-900">
          {icon}
        </div>
        <h3 className="mb-2 text-xl font-semibold text-gray-900">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
}
