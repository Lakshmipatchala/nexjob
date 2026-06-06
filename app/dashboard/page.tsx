import Link from "next/link"

const features = [
  { href: "/dashboard/jobs", emoji: "💼", title: "Browse Jobs", desc: "Fresh listings with AI match scoring, save & apply tracking" },
  { href: "/dashboard/resume", emoji: "📄", title: "AI Resume Builder", desc: "Claude rewrites your resume tailored to any job in seconds" },
  { href: "/dashboard/cover-letter", emoji: "✉️", title: "Cover Letter", desc: "AI-generated cover letters with perfect tone and length" },
  { href: "/dashboard/applications", emoji: "📋", title: "Applications", desc: "Track Applied → Screening → Interview → Offer → Rejected" },
  { href: "/dashboard/saved", emoji: "🔖", title: "Saved Jobs", desc: "All your bookmarked positions in one place" },
  { href: "/dashboard/chat", emoji: "💬", title: "AI Career Coach", desc: "Chat with Claude about resume, interviews, salary and career advice" },
  { href: "/dashboard/profile", emoji: "⚙️", title: "Profile & Settings", desc: "Personal info, AI preferences, and password management" },
]

export default function DashboardPage() {
  return (
    <div style={{ minHeight: "100vh", background: "hsl(224 71% 4%)", padding: "48px 32px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ textAlign: "center" as const, marginBottom: "48px" }}>
          <h1 style={{ fontSize: "36px", fontWeight: "700", background: "linear-gradient(135deg, #8b5cf6, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "12px" }}>
            Welcome to NexJob
          </h1>
          <p style={{ color: "hsl(215 20% 65%)", fontSize: "16px" }}>Your AI-powered job search platform</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
          {features.map(f => (
            <Link key={f.href} href={f.href} style={{ textDecoration: "none" }}>
              <div style={{ background: "hsl(224 71% 6%)", border: "1px solid hsl(216 34% 17%)", borderRadius: "14px", padding: "24px", cursor: "pointer" }}>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>{f.emoji}</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "hsl(213 31% 91%)", marginBottom: "6px" }}>{f.title}</div>
                <div style={{ fontSize: "13px", color: "hsl(215 20% 55%)", lineHeight: "1.5" }}>{f.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}