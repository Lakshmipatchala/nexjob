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
  ai_match_score?: number
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function isFresh(dateStr: string): boolean {
  return (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24) <= 1
}

function matchColor(score?: number) {
  if (!score) return null
  if (score >= 80) return { bg: "rgba(34,197,94,0.15)", color: "#4ade80" }
  if (score >= 60) return { bg: "rgba(251,191,36,0.15)", color: "#fbbf24" }
  return { bg: "rgba(248,113,113,0.15)", color: "#f87171" }
}

const JOBS_PER_PAGE = 20

export default function JobsPage() {
  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [scoring, setScoring] = useState(false)
  const [search, setSearch] = useState("")
  const [fetchQuery, setFetchQuery] = useState("software engineer")
  const [message, setMessage] = useState("")
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [workModeFilter, setWorkModeFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [currentPage, setCurrentPage] = useState(1)
  const setPrefilledJob = useUIStore(s => s.setPrefilledJob)
  const router = useRouter()

  useEffect(() => { loadJobs(); loadSaved() }, [])

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1) }, [search, workModeFilter, typeFilter, sortBy])

  async function loadJobs() {
    setLoading(true)
    const res = await fetch(`/api/jobs/list`)
    const data = await res.json()
    if (data.error) { setMessage(`Error: ${data.error}`); setLoading(false); return }
    setAllJobs(data.jobs || [])
    setLoading(false)
  }

  async function loadSaved() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from("saved_jobs").select("job_id").eq("user_id", user.id)
    if (data) setSavedIds(new Set(data.map((r: any) => r.job_id)))
  }

  async function fetchFreshJobs() {
    setFetching(true)
    setMessage(`Fetching "${fetchQuery}" jobs...`)
    const res = await fetch(`/api/jobs/fetch?query=${encodeURIComponent(fetchQuery)}`)
    const data = await res.json()
    if (data.success) { setMessage(data.message || `Found ${data.count} fresh jobs`); loadJobs() }
    else setMessage(`Error: ${data.error}`)
    setFetching(false)
  }

  async function scoreJobs() {
    setScoring(true)
    setMessage("AI is scoring job matches...")
    try {
      const res = await fetch("/api/jobs/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobs: filteredJobs.slice(0, 20) })
      })
      const data = await res.json()
      if (data.scores) {
        setAllJobs(prev => prev.map(j => ({ ...j, ai_match_score: data.scores[j.id] ?? j.ai_match_score })))
        setMessage("AI match scores updated!")
      }
    } catch { setMessage("Scoring failed") }
    setScoring(false)
  }

  async function toggleSave(job: Job) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (savedIds.has(job.id)) {
      await supabase.from("saved_jobs").delete().eq("user_id", user.id).eq("job_id", job.id)
      setSavedIds(prev => { const n = new Set(prev); n.delete(job.id); return n })
    } else {
      await supabase.from("saved_jobs").insert({ user_id: user.id, job_id: job.id, job_data: job })
      setSavedIds(prev => new Set([...prev, job.id]))
    }
  }

  function sendToResume(job: Job) {
    setPrefilledJob({ jobTitle: job.title, company: job.company, jobDescription: job.description || "" })
    router.push("/dashboard/resume")
  }

  async function applyAndTrack(job: Job) {
    window.open(job.source_url, "_blank")
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from("applications").upsert({
      user_id: user.id, job_id: job.id, job_data: job, status: "applied", applied_at: new Date().toISOString()
    }, { onConflict: "user_id,job_id" })
  }

  // Filter jobs
  const filteredJobs = allJobs.filter(j => {
    if (workModeFilter !== "all" && j.work_mode !== workModeFilter) return false
    if (typeFilter !== "all" && j.job_type !== typeFilter) return false
    if (search && !j.title.toLowerCase().includes(search.toLowerCase()) && !j.company.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }).sort((a, b) => {
    if (sortBy === "newest") return new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime()
    if (sortBy === "oldest") return new Date(a.posted_at).getTime() - new Date(b.posted_at).getTime()
    if (sortBy === "match") return (b.ai_match_score || 0) - (a.ai_match_score || 0)
    if (sortBy === "company") return a.company.localeCompare(b.company)
    return 0
  })

  // Pagination
  const totalPages = Math.ceil(filteredJobs.length / JOBS_PER_PAGE)
  const paginatedJobs = filteredJobs.slice((currentPage - 1) * JOBS_PER_PAGE, currentPage * JOBS_PER_PAGE)

  const badge = (text: string, color: string, bg: string) => ({
    display: "inline-block" as const, fontSize: "11px", padding: "3px 10px",
    borderRadius: "20px", marginRight: "6px", background: bg, color, fontWeight: "500" as const
  })

  const filterBtn = (active: boolean) => ({
    padding: "6px 14px", borderRadius: "20px", border: active ? "none" : "1px solid hsl(216 34% 25%)",
    background: active ? "#7c3aed" : "transparent", color: active ? "white" : "hsl(215 20% 65%)",
    fontSize: "12px", fontWeight: "600" as const, cursor: "pointer"
  })

  const pageBtn = (active: boolean, disabled?: boolean) => ({
    padding: "6px 12px", borderRadius: "8px", border: active ? "none" : "1px solid hsl(216 34% 25%)",
    background: active ? "#7c3aed" : "transparent", color: active ? "white" : disabled ? "hsl(215 20% 35%)" : "hsl(215 20% 65%)",
    fontSize: "13px", fontWeight: "600" as const, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1
  })

  return (
    <div style={{ minHeight: "100vh", background: "hsl(224 71% 4%)", padding: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap" as const, gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "700", color: "hsl(213 31% 91%)", margin: "0 0 4px" }}>Browse Jobs</h1>
          <p style={{ color: "hsl(215 20% 65%)", fontSize: "13px", margin: "0" }}>
            {filteredJobs.length} jobs found
            {filteredJobs.length !== allJobs.length && <span style={{ color: "hsl(215 20% 45%)" }}> (filtered from {allJobs.length})</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" as const }}>
          <input value={fetchQuery} onChange={e => setFetchQuery(e.target.value)}
            placeholder="e.g. React developer"
            style={{ background: "hsl(224 71% 8%)", border: "1px solid hsl(216 34% 17%)", borderRadius: "10px", padding: "10px 14px", color: "hsl(213 31% 91%)", fontSize: "14px", outline: "none", width: "200px" }} />
          <button onClick={fetchFreshJobs} disabled={fetching}
            style={{ background: "#7c3aed", color: "white", padding: "10px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", border: "none", cursor: "pointer", opacity: fetching ? 0.7 : 1, whiteSpace: "nowrap" as const }}>
            {fetching ? "Fetching..." : "Fetch Jobs"}
          </button>
          <button onClick={scoreJobs} disabled={scoring || allJobs.length === 0}
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "white", padding: "10px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", border: "none", cursor: "pointer", opacity: scoring ? 0.7 : 1, whiteSpace: "nowrap" as const }}>
            {scoring ? "Scoring..." : "✨ AI Match Score"}
          </button>
          <button onClick={loadJobs}
            style={{ background: "hsl(224 71% 8%)", color: "hsl(213 31% 91%)", padding: "10px 16px", borderRadius: "10px", fontSize: "14px", border: "1px solid hsl(216 34% 17%)", cursor: "pointer" }}>
            Refresh
          </button>
        </div>
      </div>

      {/* Search + Sort row */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" as const }}>
        <input
          style={{ flex: 1, minWidth: "200px", background: "hsl(224 71% 8%)", border: "1px solid hsl(216 34% 17%)", borderRadius: "10px", padding: "10px 16px", color: "hsl(213 31% 91%)", fontSize: "14px", outline: "none" }}
          placeholder="Search by job title or company..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ background: "hsl(224 71% 8%)", border: "1px solid hsl(216 34% 17%)", borderRadius: "10px", padding: "10px 14px", color: "hsl(213 31% 91%)", fontSize: "14px", outline: "none", cursor: "pointer" }}>
          <option value="newest">Sort: Newest first</option>
          <option value="oldest">Sort: Oldest first</option>
          <option value="match">Sort: AI Match Score</option>
          <option value="company">Sort: Company A-Z</option>
        </select>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" as const, alignItems: "center" }}>
        <span style={{ fontSize: "12px", color: "hsl(215 20% 45%)", marginRight: "4px" }}>Mode:</span>
        {["all", "remote", "hybrid", "onsite"].map(v => (
          <button key={v} style={filterBtn(workModeFilter === v)} onClick={() => setWorkModeFilter(v)}>
            {v === "all" ? "All" : v}
          </button>
        ))}
        <div style={{ width: "1px", background: "hsl(216 34% 17%)", margin: "0 8px", height: "20px" }} />
        <span style={{ fontSize: "12px", color: "hsl(215 20% 45%)", marginRight: "4px" }}>Type:</span>
        {["all", "full_time", "contract", "part_time"].map(v => (
          <button key={v} style={filterBtn(typeFilter === v)} onClick={() => setTypeFilter(v)}>
            {v === "all" ? "All" : v.replace("_", " ")}
          </button>
        ))}
      </div>

      {message && (
        <div style={{ padding: "12px 16px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "8px", color: "#4ade80", fontSize: "13px", marginBottom: "20px" }}>
          {message}
        </div>
      )}

      {/* Jobs grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: "hsl(215 20% 45%)" }}>Loading jobs...</div>
      ) : paginatedJobs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px", color: "hsl(215 20% 45%)" }}>
          <p style={{ fontSize: "16px", marginBottom: "8px" }}>No jobs found</p>
          <p style={{ fontSize: "13px", marginBottom: "16px" }}>Try changing your filters or fetch new jobs</p>
          <button onClick={fetchFreshJobs} disabled={fetching}
            style={{ background: "#7c3aed", color: "white", padding: "12px 24px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", border: "none", cursor: "pointer" }}>
            Fetch Jobs
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px", marginBottom: "32px" }}>
            {paginatedJobs.map(job => {
              const mc = matchColor(job.ai_match_score)
              const saved = savedIds.has(job.id)
              return (
                <div key={job.id} style={{ background: "hsl(224 71% 6%)", border: `1px solid ${isFresh(job.posted_at) ? "rgba(34,197,94,0.3)" : "hsl(216 34% 17%)"}`, borderRadius: "12px", padding: "20px", position: "relative" as const }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
                      {isFresh(job.posted_at) && (
                        <span style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "20px", letterSpacing: "0.5px" }}>NEW</span>
                      )}
                      {mc && job.ai_match_score && (
                        <span style={{ background: mc.bg, color: mc.color, fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "20px" }}>
                          {job.ai_match_score}% match
                        </span>
                      )}
                    </div>
                    <button onClick={() => toggleSave(job)} title={saved ? "Remove" : "Save"}
                      style={{ background: saved ? "rgba(124,58,237,0.2)" : "transparent", border: saved ? "1px solid rgba(124,58,237,0.4)" : "1px solid hsl(216 34% 25%)", borderRadius: "8px", padding: "4px 8px", cursor: "pointer", fontSize: "14px" }}>
                      {saved ? "🔖" : "🔗"}
                    </button>
                  </div>

                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "10px" }}>
                    {job.company_logo && (
                      <img src={job.company_logo} alt={job.company}
                        style={{ width: "36px", height: "36px", borderRadius: "8px", objectFit: "contain", background: "white", padding: "2px", flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "15px", fontWeight: "600", color: "hsl(213 31% 91%)", marginBottom: "3px" }}>{job.title}</div>
                      <div style={{ fontSize: "13px", color: "hsl(215 20% 65%)" }}>{job.company} · {job.location}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: "10px" }}>
                    <span style={badge(job.work_mode, job.work_mode === "remote" ? "#4ade80" : "#a78bfa", job.work_mode === "remote" ? "rgba(74,222,128,0.1)" : "rgba(124,110,245,0.15)")}>{job.work_mode}</span>
                    <span style={badge(job.job_type, "#a78bfa", "rgba(124,110,245,0.15)")}>{job.job_type}</span>
                    <span style={badge(job.source, "#60a5fa", "rgba(96,165,250,0.1)")}>{job.source}</span>
                    {job.salary_min && <span style={badge(`$${Math.round(job.salary_min / 1000)}k+`, "#fbbf24", "rgba(251,191,36,0.1)")}>${Math.round(job.salary_min / 1000)}k+</span>}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "14px", gap: "8px" }}>
                    <span style={{ fontSize: "12px", color: "hsl(215 20% 45%)" }}>🕐 {timeAgo(job.posted_at)}</span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => sendToResume(job)}
                        style={{ background: "hsl(224 71% 10%)", color: "#a78bfa", padding: "7px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", border: "1px solid rgba(124,58,237,0.3)", cursor: "pointer" }}>
                        AI Resume
                      </button>
                      <button onClick={() => applyAndTrack(job)}
                        style={{ background: "#7c3aed", color: "white", padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", border: "none", cursor: "pointer" }}>
                        Apply →
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", flexWrap: "wrap" as const }}>
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} style={pageBtn(false, currentPage === 1)}>«</button>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={pageBtn(false, currentPage === 1)}>‹ Prev</button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .reduce((acc: (number | string)[], p, i, arr) => {
                  if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("...")
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) => (
                  <button key={i}
                    onClick={() => typeof p === "number" && setCurrentPage(p)}
                    disabled={p === "..."}
                    style={pageBtn(p === currentPage, p === "...")}>
                    {p}
                  </button>
                ))}

              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={pageBtn(false, currentPage === totalPages)}>Next ›</button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} style={pageBtn(false, currentPage === totalPages)}>»</button>

              <span style={{ fontSize: "13px", color: "hsl(215 20% 45%)", marginLeft: "8px" }}>
                Page {currentPage} of {totalPages} · {filteredJobs.length} jobs
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}