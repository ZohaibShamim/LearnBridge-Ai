import Link from "next/link";
import Image from "next/image";
import {
  Brain,
  BookOpen,
  FileText,
  Target,
  TrendingUp,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

const paths = [
  { image: "/images/ai-learning.jpg", title: "Artificial Intelligence", description: "Neural networks, deep learning, and real-world AI systems." },
  { image: "/images/machine-learning.jpg", title: "Machine Learning", description: "Algorithms, model training, and predictive analytics." },
  { image: "/images/data-science.jpg", title: "Data Science", description: "Data wrangling, visualization, and drawing insight." },
  { image: "/images/data-science.jpg", title: "Software Engineering", description: "Systems, best practices, and shipping production code." },
];

const features = [
  { icon: Target, title: "Personalized Roadmaps", description: "AI-generated learning paths tailored to your CV and target role — not a generic curriculum." },
  { icon: FileText, title: "Resume Analysis", description: "Upload your resume and see exactly which skills you have and which you still need." },
  { icon: BookOpen, title: "Knowledge-Check Quizzes", description: "Test what you've learned with quizzes tied to each skill, scored and reviewed." },
  { icon: TrendingUp, title: "Progress Tracking", description: "Every roadmap shows how far you've come and what to do next, at a glance." },
  { icon: Brain, title: "Curated Resources", description: "Hand-picked videos and articles attached to every step of your journey." },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-white">
      {/* Navbar */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg brand-gradient shadow-md shadow-blue-500/25">
              <Brain className="h-4 w-4 text-white" />
            </span>
            LearnBridge <span className="-ml-1 text-blue-600">AI</span>
          </Link>
          <div className="hidden items-center gap-7 md:flex">
            <Link href="#paths" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">Learning Paths</Link>
            <Link href="#features" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">Features</Link>
          </div>
          <div className="flex items-center gap-2.5">
            <Link href="/login" className="tap rounded-xl px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100">
              Sign In
            </Link>
            <Link href="/signup" className="tap inline-flex items-center gap-1.5 rounded-xl brand-gradient px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 active:scale-[0.97]">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden pt-16">
        <Image src="/images/hero-cover.jpg" alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-blue-950/80 to-indigo-900/40" />
        <div className="relative mx-auto w-full max-w-6xl px-5">
          <div className="max-w-2xl">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-blue-300" />
              AI-powered career roadmaps
            </span>
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Turn your resume into a{" "}
              <span className="text-blue-400">personalized</span> path forward.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-200">
              Upload your CV, pick a target role, and get a step-by-step roadmap with
              curated resources and quizzes — built around where you are and where you want to be.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="tap inline-flex h-12 items-center justify-center gap-2 rounded-xl brand-gradient px-7 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-blue-500/50 active:scale-[0.98]">
                Get started free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className="tap inline-flex h-12 items-center justify-center rounded-xl border border-white/25 bg-white/5 px-7 text-base font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10">
                Sign in
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-300">
              {["No credit card", "4 career tracks", "Resume skill-gap analysis"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-400" /> {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Learning paths */}
      <section id="paths" className="bg-slate-50 px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Explore learning paths</h2>
            <p className="mt-3 text-slate-600">Choose a track and master in-demand tech skills, one step at a time.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {paths.map((p) => (
              <article key={p.title} className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image src={p.image} alt={p.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/10 to-transparent" />
                  <h3 className="absolute bottom-3 left-4 right-4 text-lg font-bold text-white">{p.title}</h3>
                </div>
                <p className="p-5 text-sm leading-relaxed text-slate-600">{p.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Everything you need to level up</h2>
            <p className="mt-3 text-slate-600">A personalized system that answers "how far am I" and "what's next" on every screen.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <article key={f.title} className="rounded-2xl border border-slate-100 bg-white p-7 shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[var(--shadow-lg)]">
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-slate-900">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-600">{f.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-24">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl brand-gradient px-6 py-16 text-center md:px-16 md:py-20">
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Ready to start your journey?</h2>
            <p className="mx-auto mt-4 max-w-xl text-blue-100">
              Join learners using LearnBridge AI to turn their resume into a clear, guided path forward.
            </p>
            <Link href="/signup" className="tap mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-8 text-base font-semibold text-blue-700 shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]">
              Create free account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <span className="flex h-6 w-6 items-center justify-center rounded-md brand-gradient">
              <Brain className="h-3.5 w-3.5 text-white" />
            </span>
            LearnBridge AI
          </div>
          <p>© 2026 LearnBridge AI — AI-driven learning platform.</p>
        </div>
      </footer>
    </div>
  );
}
