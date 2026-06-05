"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useUIStore } from "@/store/ui.store"
import { useRouter } from "next/navigation"

export default function SavedPage() {
  const [saved, setSaved] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState("")
  const setPrefilledJob = useUIStore(s => s.setPrefilledJob)
  const router = useRouter()

  useEffect(() => { initUser() }, [])

  async function initUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) { setUserId(user.id); loadSaved(user.id) }
    else setLoading(false)
  }

  async function loadSaved(uid: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/saved/list?userId=${uid}`)
      const data = await res.json()
      setSaved(data.saved || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function unsave(rowId: string, jobId: string) {
    await fetch("/api/saved", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, jobId })
    })
    setSaved(prev => prev.filter(s => s.id !== rowId))
  }

  function sendToResume(job: any) {
    setPrefilledJob({ jobTitle: job.title, company: job.company, jobDescription: job.description || "" })
    router.push("/dashboard/resume")
  }

  const badge = (text: string, color: string, bg: string) => ({
    display: "inline-block" as const, fontSize: "11px", padding: "3px 10px",
    borderRadius: "20px", marginRight: "6px", background: bg, color, fontWeight: "500" as const
  })

  return (
    <div style={{ minHeight: "100vh", background: "hsl(224 71% 4%)", padding: "32px" }}>
      <h1 style={{ fontSize: "28px", fontWeight: "700", color: "hsl(213 31% 91%)", marginBottom: "6px" }}>Saved Jobs</h1>
      <p style={{ color: "hsl(215 20% 65%)", fontSize: "13px", marginBottom: "28px" }}>{saved.length} saved positions</p>
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: "hsl(215 20% 45%)" }}>Loading...</div>
      ) : saved.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px", color: "hsl(215 20% 45%)" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔖</div>
          <p style={{ fontSize: "16px", marginBottom: "8px" }}>No saved jobs yet</p>
          <p style={{ fontSize: "13px" }}>Click ☆ Save on any job card to save it here</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
          {saved.map(row => {
            const job = row.job_data || row
            return (
              <div key={row.id} style={{ background: "hsl(224 71% 6%)", border: "1px solid hsl(216 34% 17%)", borderRadius: "12px", padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "15px", fontWeight: "600", color: "hsl(213 31% 91%)", marginBottom: "3px" }}>{job.title}</div>
                    <div style={{ fontSize: "13px", color: "hsl(215 20% 65%)" }}>{job.company} · {job.location}</div>
                  </div>
                  <button onClick={() => unsave(row.id, row.job_id)}
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontSize: "12px", color: "#f87171", fontWeight: "600" as const }}>
                    Remove
                  </button>
                </div>
                <div style={{ marginBottom: "12px" }}>
                  {job.work_mode && <span style={badge(job.work_mode, "#a78bfa", "rgba(124,110,245,0.15)")}>{job.work_mode}</span>}
                  {job.job_type && <span style={badge(job.job_type, "#60a5fa", "rgba(96,165,250,0.1)")}>{job.job_type?.replace("_"," ")}</span>}
                  {job.salary_min && <span style={badge(`$${Math.round(job.salary_min/1000)}k+`, "#fbbf24", "rgba(251,191,36,0.1)")}>${Math.round(job.salary_min/1000)}k+</span>}
                </div>
                <div style={{ fontSize: "11px", color: "hsl(215 20% 45%)", marginBottom: "14px" }}>
                  Saved {new Date(row.saved_at).toLocaleDateString()}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => sendToResume(job)}
                    style={{ flex: 1, background: "hsl(224 71% 10%)", color: "#a78bfa", padding: "8px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", border: "1px solid rgba(124,58,237,0.3)", cursor: "pointer" }}>
                    AI Resume
                  </button>
                  <button onClick={() => window.open(job.source_url, "_blank")}
                    style={{ flex: 1, background: "#7c3aed", color: "white", padding: "8px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", border: "none", cursor: "pointer" }}>
                    Apply →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}