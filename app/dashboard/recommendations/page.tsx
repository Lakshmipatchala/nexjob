"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useUIStore } from "@/store/ui.store"
import { useRouter } from "next/navigation"

interface Job {
  id: string
  title: string
  company: string
  company_logo?: string
  location: string
  work_mode: string
  job_type: string
  salary_min?: number
  salary_max?: number
  source: string
  source_url: string
  posted_at: string
  description?: string
  match_score?: number
  match_reasons?: string[]
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function RecommendationsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [userId, setUserId] = useState("")
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const setPrefilledJob = useUIStore(s => s.setPrefilledJob)
  const router = useRouter()

  useEffect(() => { initUser() }, [])

  async function initUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setUserId(user.id)
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    setProfile(prof)
    loadSaved(user.id)
    if (prof?.resume_summary || prof?.desired_title) {
      loadRecommendations(user.id, prof)
    } else {
      setLoading(false)
    }
  }

  async function loadSaved(uid: string) {
    const res = await fetch(`/api/saved?userId=${uid}`)
    const data = await res.json()
    if (data.savedIds) setSavedIds(new Set(data.savedIds))
  }

  async function loadRecommendations(uid: string, prof: any) {
    setLoading(true)
    setMessage("")
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid, profile: prof })
      })
      const data = await res.json()
      if (data.jobs) setJobs(data.jobs)
      else setMessage(data.error || "Could not load recommendations")
    } catch (e: any) { setMessage(e.message) }
    setLoading(false)
  }

  async function toggleSave(job: Job) {
    if (!userId) return
    setSavingId(job.id)
    try {
      if (savedIds.has(job.id)) {
        await fetch("/api/saved", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, jobId: job.id }) })
        setSavedIds(prev => { const n = new Set(prev); n.delete(job.id); return n })
      } else {
        await fetch("/api/saved", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, jobId: job.id, jobData: job }) })
        setSavedIds(prev => new Set([...prev, job.id]))
      }
    } catch (e) { console.error(e) }
    setSavingId(null)
  }

  async function applyAndTrack(job: Job) {
    window.open(job.source_url, "_blank")
    if (!userId) return
    await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, jobId: job.id, jobData: job, status: "applied" }) })
    setJobs(prev => prev.filter(j => j.id !== job.id))
    setMessage(`✓ "${job.title}" moved to Applications`)
    setTimeout(() => setMessage(""), 3000)
  }

  function sendToResume(job: Job) {
    setPrefilledJob({ jobTitle: job.title, company: job.company, jobDescription: job.description || "" })
    router.push("/dashboard/resume")
  }

  function scoreColor(score: number) {
    if (score >= 80) return { color: "#4ade80", bg: "rgba(34,197,94,0.15)", label: "Excellent" }
    if (score >= 60) return { color: "#fbbf24", bg: "rgba(251,191,36,0.15)", label: "Good" }
    return { color: "#f87171", bg: "rgba(248,113,113,0.15)", label: "Partial" }
  }

  const badge = (text: string, color: string, bg: string) => ({
    display: "inline-block" as const, fontSize: "11px", padding: "3px 10px",
    borderRadius: "20px", marginRight: "6px", background: bg, color, fontWeight: "500" as const
  })

  if (!loading && !profile?.resume_summary && !profile?.desired_title) {
    return (
      <div style={{ minHeight: "100vh", background: "hsl(224 71% 4%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px" }}>
        <div style={{ textAlign: "center" as const, maxWidth: "480px" }}>
          <div style={{ fontSize: "64px", marginBottom: "24px" }}>🎯</div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "hsl(213 31% 91%)", marginBottom: "12px" }}>Complete your profile first</h1>
          <p style={{ color: "hsl(215 20% 65%)", fontSize: "15px", marginBottom: "28px", lineHeight: "1.6" }}>
            Add your desired job title and resume summary so AI can find your best matches.
          </p>
          <button onClick={() => router.push("/dashboard/profile")}
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "white", padding: "14px 32px", borderRadius: "10px", fontSize: "15px", fontWeight: "600", border: "none", cursor: "pointer" }}>
            Complete Profile →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "hsl(224 71% 4%)", padding: "32px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap" as const, gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "700", color: "hsl(213 31% 91%)", margin: "0 0 6px" }}>🎯 Recommended for You</h1>
          <p style={{ color: "hsl(215 20% 65%)", fontSize: "13px", margin: "0" }}>
            AI-matched jobs based on your profile · {jobs.length} recommendations
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => loadRecommendations(userId, profile)}
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "white", padding: "10px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", border: "none", cursor: "pointer" }}>
            🔄 Refresh
          </button>
          <button onClick={() => router.push("/dashboard/profile")}
            style={{ background: "hsl(224 71% 8%)", color: "hsl(213 31% 91%)", padding: "10px 16px", borderRadius: "10px", fontSize: "14px", border: "1px solid hsl(216 34% 17%)", cursor: "pointer" }}>
            ⚙️ Profile
          </button>
        </div>
      </div>

      {profile && (
        <div style={{ background: "hsl(224 71% 6%)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: "12px", padding: "16px 20px", marginBottom: "24px", display: "flex", gap: "24px", flexWrap: "wrap" as const }}>
          <div><div style={{ fontSize: "11px", color: "hsl(215 20% 45%)", marginBottom: "3px" }}>LOOKING FOR</div><div style={{ fontSize: "14px", fontWeight: "600", color: "hsl(213 31% 91%)" }}>{profile.desired_title || "Not set"}</div></div>
          <div><div style={{ fontSize: "11px", color: "hsl(215 20% 45%)", marginBottom: "3px" }}>EXPERIENCE</div><div style={{ fontSize: "14px", fontWeight: "600", color: "hsl(213 31% 91%)" }}>{profile.years_experience ? `${profile.years_experience} yrs` : "Not set"}</div></div>
          <div><div style={{ fontSize: "11px", color: "hsl(215 20% 45%)", marginBottom: "3px" }}>LOCATION</div><div style={{ fontSize: "14px", fontWeight: "600", color: "hsl(213 31% 91%)" }}>{profile.desired_location || "Any"}</div></div>
          <div><div style={{ fontSize: "11px", color: "hsl(215 20% 45%)", marginBottom: "3px" }}>TARGET SALARY</div><div style={{ fontSize: "14px", fontWeight: "600", color: "hsl(213 31% 91%)" }}>{profile.target_salary || "Not set"}</div></div>
        </div>
      )}

      {message && (
        <div style={{ padding: "12px 16px", background: message.startsWith("Error") ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", border: `1px solid ${message.startsWith("Error") ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`, borderRadius: "8px", color: message.startsWith("Error") ? "#f87171" : "#4ade80", fontSize: "13px", marginBottom: "20px" }}>
          {message}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center" as const, padding: "64px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🤖</div>
          <div style={{ fontSize: "18px", fontWeight: "600", color: "hsl(213 31% 91%)", marginBottom: "8px" }}>AI is finding your best matches...</div>
          <div style={{ fontSize: "14px", color: "hsl(215 20% 55%)" }}>Analyzing your profile against all available jobs</div>
        </div>
      ) : jobs.length === 0 ? (
        <div style={{ textAlign: "center" as const, padding: "64px", color: "hsl(215 20% 45%)" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
          <p style={{ fontSize: "16px", marginBottom: "8px" }}>No recommendations found</p>
          <p style={{ fontSize: "13px", marginBottom: "20px" }}>Make sure jobs are loaded and your profile is complete</p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" as const }}>
            <button onClick={() => router.push("/dashboard/jobs")}
              style={{ background: "#7c3aed", color: "white", padding: "12px 24px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", border: "none", cursor: "pointer" }}>
              Browse Jobs First
            </button>
            <button onClick={() => router.push("/dashboard/profile")}
              style={{ background: "hsl(224 71% 8%)", color: "hsl(213 31% 91%)", padding: "12px 24px", borderRadius: "10px", fontSize: "14px", border: "1px solid hsl(216 34% 17%)", cursor: "pointer" }}>
              Update Profile
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: "14px" }}>
          {jobs.map((job, index) => {
            const sc = scoreColor(job.match_score || 0)
            const saved = savedIds.has(job.id)
            const isSaving = savingId === job.id
            return (
              <div key={job.id} style={{ background: "hsl(224 71% 6%)", border: "1px solid hsl(216 34% 17%)", borderRadius: "14px", padding: "20px", display: "flex", gap: "16px", alignItems: "flex-start", flexWrap: "wrap" as const }}>
                {/* Rank */}
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: index < 3 ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "hsl(224 71% 10%)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700", flexShrink: 0 }}>
                  {index + 1}
                </div>

                {/* Logo */}
                {job.company_logo ? (
                  <img src={job.company_logo} alt={job.company} style={{ width: "44px", height: "44px", borderRadius: "10px", objectFit: "contain", background: "white", padding: "3px", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "linear-gradient(135deg, #7c3aed, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "700", color: "white", flexShrink: 0 }}>
                    {job.company?.[0]?.toUpperCase()}
                  </div>
                )}

                {/* Content */}
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "6px", flexWrap: "wrap" as const }}>
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: "hsl(213 31% 91%)", marginBottom: "2px" }}>{job.title}</div>
                      <div style={{ fontSize: "13px", color: "hsl(215 20% 65%)" }}>{job.company} · {job.location}</div>
                    </div>
                    <div style={{ background: sc.bg, border: `1px solid ${sc.color}40`, borderRadius: "10px", padding: "8px 14px", textAlign: "center" as const, flexShrink: 0 }}>
                      <div style={{ fontSize: "20px", fontWeight: "800", color: sc.color }}>{job.match_score}%</div>
                      <div style={{ fontSize: "10px", color: sc.color, fontWeight: "600" }}>{sc.label} match</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: "8px" }}>
                    <span style={badge(job.work_mode, job.work_mode === "remote" ? "#4ade80" : "#a78bfa", job.work_mode === "remote" ? "rgba(74,222,128,0.1)" : "rgba(124,110,245,0.15)")}>{job.work_mode}</span>
                    <span style={badge(job.job_type?.replace("_"," "), "#60a5fa", "rgba(96,165,250,0.1)")}>{job.job_type?.replace("_"," ")}</span>
                    <span style={badge(job.source, "#94a3b8", "rgba(148,163,184,0.1)")}>{job.source}</span>
                    {job.salary_min && <span style={badge(`$${Math.round(job.salary_min/1000)}k+`, "#fbbf24", "rgba(251,191,36,0.1)")}>${Math.round(job.salary_min/1000)}k+</span>}
                  </div>

                  {job.match_reasons && job.match_reasons.length > 0 && (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const, marginBottom: "12px" }}>
                      {job.match_reasons.map((r, i) => (
                        <span key={i} style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: "rgba(124,58,237,0.1)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}>✓ {r}</span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: "8px" }}>
                    <span style={{ fontSize: "12px", color: "hsl(215 20% 45%)" }}>🕐 {timeAgo(job.posted_at)}</span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => toggleSave(job)} disabled={isSaving}
                        style={{ background: saved ? "rgba(124,58,237,0.2)" : "transparent", border: saved ? "1px solid rgba(124,58,237,0.4)" : "1px solid hsl(216 34% 25%)", borderRadius: "8px", padding: "7px 12px", cursor: "pointer", fontSize: "12px", color: saved ? "#a78bfa" : "hsl(215 20% 55%)", fontWeight: "600" as const }}>
                        {isSaving ? "..." : saved ? "★ Saved" : "☆ Save"}
                      </button>
                      <button onClick={() => sendToResume(job)}
                        style={{ background: "hsl(224 71% 10%)", color: "#a78bfa", padding: "7px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", border: "1px solid rgba(124,58,237,0.3)", cursor: "pointer" }}>
                        AI Resume
                      </button>
                      <button onClick={() => applyAndTrack(job)}
                        style={{ background: "#7c3aed", color: "white", padding: "7px 18px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", border: "none", cursor: "pointer" }}>
                        Apply →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}