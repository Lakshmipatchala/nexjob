"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const [stats, setStats] = useState({ applications: 0, saved: 0, resumes: 0, jobs: 0 })
  const [profile, setProfile] = useState<any>(null)
  const [recentJobs, setRecentJobs] = useState<any[]>([])
  const [recentApps, setRecentApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [profRes, appsRes, savedRes, resumesRes, jobsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("applications").select("id,status,job_data,applied_at").eq("user_id", user.id).order("applied_at", { ascending: false }),
      supabase.from("saved_jobs").select("id").eq("user_id", user.id),
      fetch(`/api/resumes?userId=${user.id}`).then(r => r.json()),
      fetch(`/api/jobs/list?userId=${user.id}`).then(r => r.json()),
    ])

    setProfile(profRes.data)
    setStats({
      applications: appsRes.data?.length || 0,
      saved: savedRes.data?.length || 0,
      resumes: resumesRes.resumes?.length || 0,
      jobs: jobsRes.jobs?.length || 0,
    })
    setRecentJobs((jobsRes.jobs || []).slice(0, 5))
    setRecentApps((appsRes.data || []).slice(0, 3))
    setLoading(false)
  }

  function greeting() {
    const h = new Date().getHours()
    if (h < 12) return "Good morning"
    if (h < 17) return "Good afternoon"
    return "Good evening"
  }

  const STATUS_COLOR: Record<string, {color: string, bg: string}> = {
    applied:   { color: "#60a5fa", bg: "rgba(96,165,250,0.15)" },
    screening: { color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
    interview: { color: "#a78bfa", bg: "rgba(167,139,250,0.15)" },
    offer:     { color: "#4ade80", bg: "rgba(74,222,128,0.15)" },
    rejected:  { color: "#f87171", bg: "rgba(248,113,113,0.15)" },
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: "1100px" }}>

      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "white", margin: "0 0 4px" }}>
          {greeting()}{profile?.first_name ? `, ${profile.first_name}` : ""}! 👋
        </h1>
        <p style={{ fontSize: "13px", color: "hsl(220 15% 55%)", margin: 0 }}>
          {profile?.desired_title ? `Searching for ${profile.desired_title} roles` : "Complete your profile to get AI-matched job recommendations"}
        </p>
      </div>

      {/* Profile completion banner */}
      {!loading && !profile?.resume_summary && (
        <div style={{ background: "rgba(124,111,240,0.12)", border: "1px solid rgba(124,111,240,0.3)", borderRadius: "12px", padding: "14px 18px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" as const }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#c4b5fd", marginBottom: "2px" }}>
              ✨ Unlock personalized AI recommendations
            </div>
            <div style={{ fontSize: "12px", color: "hsl(220 15% 55%)" }}>
              Add your resume summary and desired job title to your profile
            </div>
          </div>
          <button onClick={() => router.push("/dashboard/profile")}
            style={{ background: "linear-gradient(135deg, #7c6ff0, #a78bfa)", color: "white", padding: "8px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", border: "none", cursor: "pointer", whiteSpace: "nowrap" as const }}>
            Complete Profile →
          </button>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "Active Jobs", value: stats.jobs, icon: "💼", color: "#9b8ff4", bg: "rgba(124,111,240,0.12)", href: "/dashboard/jobs" },
          { label: "Applications", value: stats.applications, icon: "📤", color: "#4ade80", bg: "rgba(74,222,128,0.12)", href: "/dashboard/applications" },
          { label: "Saved Jobs", value: stats.saved, icon: "🔖", color: "#60a5fa", bg: "rgba(96,165,250,0.12)", href: "/dashboard/saved" },
          { label: "My Resumes", value: `${stats.resumes}/3`, icon: "📄", color: "#fbbf24", bg: "rgba(251,191,36,0.12)", href: "/dashboard/resumes" },
        ].map(s => (
          <Link key={s.href} href={s.href} style={{ textDecoration: "none" }}>
            <div style={{ background: "hsl(228 25% 8%)", border: "1px solid hsl(228 20% 14%)", borderRadius: "12px", padding: "16px", cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(124,111,240,0.4)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "hsl(228 20% 14%)")}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
                  {s.icon}
                </div>
                <span style={{ fontSize: "24px", fontWeight: "700", color: s.color }}>{s.value}</span>
              </div>
              <div style={{ fontSize: "12px", color: "hsl(220 15% 55%)", fontWeight: "500" }}>{s.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Two column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px" }}>

        {/* Recent jobs */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "hsl(220 15% 45%)", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>Latest Jobs</div>
            <Link href="/dashboard/jobs" style={{ fontSize: "12px", color: "#9b8ff4", textDecoration: "none" }}>View all →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px" }}>
            {recentJobs.length === 0 ? (
              <div style={{ background: "hsl(228 25% 8%)", border: "1px solid hsl(228 20% 14%)", borderRadius: "10px", padding: "24px", textAlign: "center" as const, color: "hsl(220 15% 45%)", fontSize: "13px" }}>
                No jobs yet — click <Link href="/dashboard/jobs" style={{ color: "#9b8ff4" }}>Browse Jobs</Link> and fetch some!
              </div>
            ) : recentJobs.map(job => (
              <div key={job.id} style={{ background: "hsl(228 25% 8%)", border: "1px solid hsl(228 20% 14%)", borderRadius: "10px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", transition: "border-color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(124,111,240,0.3)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "hsl(228 20% 14%)")}>
                {job.company_logo ? (
                  <img src={job.company_logo} alt={job.company} style={{ width: "36px", height: "36px", borderRadius: "8px", objectFit: "contain", background: "white", padding: "2px", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(124,111,240,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "700", color: "#a78bfa", flexShrink: 0 }}>
                    {job.company?.[0]?.toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "white", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>{job.title}</div>
                  <div style={{ fontSize: "12px", color: "hsl(220 15% 55%)" }}>{job.company} · {job.location}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: job.work_mode === "remote" ? "rgba(74,222,128,0.15)" : "rgba(124,111,240,0.15)", color: job.work_mode === "remote" ? "#4ade80" : "#a78bfa", fontWeight: "500" }}>
                    {job.work_mode}
                  </span>
                  <button onClick={() => window.open(job.source_url, "_blank")}
                    style={{ background: "linear-gradient(135deg, #7c6ff0, #a78bfa)", color: "white", border: "none", borderRadius: "6px", padding: "5px 12px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                    Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column" as const, gap: "16px" }}>

          {/* Quick actions */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "hsl(220 15% 45%)", textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: "10px" }}>Quick Actions</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                { href: "/dashboard/recommendations", icon: "🎯", label: "For You" },
                { href: "/dashboard/resume", icon: "✨", label: "AI Resume" },
                { href: "/dashboard/chat", icon: "💬", label: "AI Coach" },
                { href: "/dashboard/cover-letter", icon: "✉️", label: "Cover Letter" },
              ].map(a => (
                <Link key={a.href} href={a.href} style={{ textDecoration: "none" }}>
                  <div style={{ background: "hsl(228 25% 8%)", border: "1px solid hsl(228 20% 14%)", borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "6px", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(124,111,240,0.4)"; e.currentTarget.style.background = "rgba(124,111,240,0.08)" }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "hsl(228 20% 14%)"; e.currentTarget.style.background = "hsl(228 25% 8%)" }}>
                    <span style={{ fontSize: "20px" }}>{a.icon}</span>
                    <span style={{ fontSize: "12px", fontWeight: "500", color: "hsl(220 15% 70%)" }}>{a.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent applications */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "hsl(220 15% 45%)", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>Recent Applications</div>
              <Link href="/dashboard/applications" style={{ fontSize: "12px", color: "#9b8ff4", textDecoration: "none" }}>View all →</Link>
            </div>
            {recentApps.length === 0 ? (
              <div style={{ background: "hsl(228 25% 8%)", border: "1px solid hsl(228 20% 14%)", borderRadius: "10px", padding: "20px", textAlign: "center" as const, color: "hsl(220 15% 45%)", fontSize: "12px" }}>
                No applications yet
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "6px" }}>
                {recentApps.map(app => {
                  const job = app.job_data || {}
                  const sc = STATUS_COLOR[app.status] || STATUS_COLOR.applied
                  return (
                    <div key={app.id} style={{ background: "hsl(228 25% 8%)", border: "1px solid hsl(228 20% 14%)", borderRadius: "10px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "30px", height: "30px", borderRadius: "6px", background: "rgba(124,111,240,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", color: "#a78bfa", flexShrink: 0 }}>
                        {job.company?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "12px", fontWeight: "600", color: "white", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>{job.title || "Unknown role"}</div>
                        <div style={{ fontSize: "11px", color: "hsl(220 15% 55%)" }}>{job.company || "Unknown"}</div>
                      </div>
                      <span style={{ fontSize: "10px", fontWeight: "600", padding: "2px 8px", borderRadius: "20px", background: sc.bg, color: sc.color, flexShrink: 0 }}>
                        {app.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}