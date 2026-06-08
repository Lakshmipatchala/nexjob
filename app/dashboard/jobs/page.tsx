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

const COUNTRIES = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "REMOTE", name: "Remote (Worldwide)", flag: "🌍" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "AE", name: "UAE", flag: "🇦🇪" },
]

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
  const lastJobSearch = useUIStore(s => s.lastJobSearch)
  const setLastJobSearch = useUIStore(s => s.setLastJobSearch)
  const setPrefilledJob = useUIStore(s => s.setPrefilledJob)
  const router = useRouter()

  const [userId, setUserId] = useState("")
  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [scoring, setScoring] = useState(false)
  const [search, setSearch] = useState("")
  const [fetchQuery, setFetchQuery] = useState(lastJobSearch || "software engineer")
  const [country, setCountry] = useState("US")
  const [message, setMessage] = useState("")
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [savingId, setSavingId] = useState<string | null>(null)
  const [workModeFilter, setWorkModeFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => { initUser() }, [])
  useEffect(() => { setCurrentPage(1) }, [search, workModeFilter, typeFilter, sortBy])

  async function initUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      loadSavedViaAPI(user.id)
    }
    loadJobs(user?.id || "", lastJobSearch || "")
  }

  async function loadJobs(uid?: string, q?: string) {
    setLoading(true)
    const id = uid !== undefined ? uid : userId
    const params = new URLSearchParams()
    if (id) params.set("userId", id)
    if (q && q.trim()) params.set("query", q.trim())
    const res = await fetch(`/api/jobs/list?${params.toString()}`)
    const data = await res.json()
    if (data.error) { setMessage(`Error: ${data.error}`); setLoading(false); return 0 }
    setAllJobs(data.jobs || [])
    setLoading(false)
    return data.jobs?.length || 0
  }

  async function loadSavedViaAPI(uid: string) {
    try {
      const res = await fetch(`/api/saved?userId=${uid}`)
      const data = await res.json()
      if (data.savedIds) setSavedIds(new Set(data.savedIds))
    } catch (e) { console.error(e) }
  }

  async function fetchFreshJobs() {
    if (fetching) return
    setFetching(true)
    setLastJobSearch(fetchQuery)
    const selectedCountry = COUNTRIES.find(c => c.code === country)
    const countryName = selectedCountry?.name || "United States"
    setMessage(`Fetching "${fetchQuery}" jobs in ${countryName}...`)
    try {
      const params = new URLSearchParams({ query: fetchQuery, country })
      const res = await fetch(`/api/jobs/fetch?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setMessage(`✓ ${data.message}`)
        await loadJobs(userId, fetchQuery)
        setTimeout(() => setMessage(""), 4000)
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch (e: any) { setMessage(`Error: ${e.message}`) }
    setFetching(false)
  }

  async function scoreJobs() {
    if (scoring || allJobs.length === 0) return
    setScoring(true)
    setMessage("AI is scoring matches...")
    try {
      const res = await fetch("/api/jobs/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobs: filteredJobs.slice(0, 20) })
      })
      const data = await res.json()
      if (data.scores) {
        setAllJobs(prev => prev.map(j => ({ ...j, ai_match_score: data.scores[j.id] ?? j.ai_match_score })))
        setMessage("✓ AI match scores updated!")
        setTimeout(() => setMessage(""), 3000)
      }
    } catch { setMessage("Scoring failed") }
    setScoring(false)
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
        setMessage(`✓ Saved!`)
        setTimeout(() => setMessage(""), 2000)
      }
    } catch (e) { console.error(e) }
    setSavingId(null)
  }

  function sendToResume(job: Job) {
    setPrefilledJob({ jobTitle: job.title, company: job.company, jobDescription: job.description || "" })
    router.push("/dashboard/resume")
  }

  async function applyAndTrack(job: Job) {
    window.open(job.source_url, "_blank")
    if (!userId) return
    await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, jobId: job.id, jobData: job, status: "applied" }) })
    setAllJobs(prev => prev.filter(j => j.id !== job.id))
    setMessage(`✓ Applied to "${job.title}" — moved to Applications`)
    setTimeout(() => setMessage(""), 3000)
  }

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

  const totalPages = Math.ceil(filteredJobs.length / JOBS_PER_PAGE)
  const paginatedJobs = filteredJobs.slice((currentPage - 1) * JOBS_PER_PAGE, currentPage * JOBS_PER_PAGE)

  const badge = (text: string, color: string, bg: string) => ({
    display: "inline-block" as const, fontSize: "11px", padding: "3px 10px",
    borderRadius: "20px", marginRight: "6px", background: bg, color, fontWeight: "500" as const
  })

  const filterBtn = (active: boolean) => ({
    padding: "6px 14px", borderRadius: "20px",
    border: active ? "none" : "1px solid hsl(228 20% 20%)",
    background: active ? "#7c6ff0" : "transparent",
    color: active ? "white" : "hsl(220 15% 60%)",
    fontSize: "12px", fontWeight: "600" as const, cursor: "pointer"
  })

  const pageBtn = (active: boolean, disabled?: boolean) => ({
    padding: "6px 12px", borderRadius: "8px",
    border: active ? "none" : "1px solid hsl(228 20% 20%)",
    background: active ? "#7c6ff0" : "transparent",
    color: active ? "white" : disabled ? "hsl(220 15% 30%)" : "hsl(220 15% 60%)",
    fontSize: "13px", fontWeight: "600" as const,
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1
  })

  const sourceColor: Record<string, { color: string, bg: string }> = {
    linkedin: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
    indeed: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
    glassdoor: { color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
    remotive: { color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
    adzuna: { color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
    dice: { color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
    greenhouse: { color: "#34d399", bg: "rgba(52,211,153,0.12)" },
    lever: { color: "#f87171", bg: "rgba(248,113,113,0.12)" },
    jobicy: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
    themuse: { color: "#c084fc", bg: "rgba(192,132,252,0.12)" },
    other: { color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  }

  return (
    <div style={{ minHeight: "100vh", background: "hsl(224 71% 4%)", padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "26px", fontWeight: "700", color: "white", margin: "0 0 4px" }}>Browse Jobs</h1>
        <p style={{ color: "hsl(220 15% 50%)", fontSize: "13px", margin: 0 }}>
          {filteredJobs.length} jobs found
          {savedIds.size > 0 && <span style={{ marginLeft: "10px", color: "#9b8ff4" }}>· {savedIds.size} saved</span>}
        </p>
      </div>

      {/* Search bar */}
      <div style={{ background: "hsl(228 25% 8%)", border: "1px solid hsl(228 20% 16%)", borderRadius: "14px", padding: "16px 20px", marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" as const, alignItems: "center" }}>
          {/* Job title input */}
          <div style={{ flex: 1, minWidth: "200px", position: "relative" as const }}>
            <span style={{ position: "absolute" as const, left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "16px" }}>🔍</span>
            <input
              value={fetchQuery}
              onChange={e => setFetchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && fetchFreshJobs()}
              placeholder="Job title, role, or keyword..."
              style={{ width: "100%", background: "hsl(228 25% 11%)", border: "1px solid hsl(228 20% 20%)", borderRadius: "10px", padding: "10px 14px 10px 38px", color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box" as const }}
            />
          </div>

          {/* Country selector */}
          <div style={{ position: "relative" as const }}>
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              style={{ background: "hsl(228 25% 11%)", border: "1px solid hsl(228 20% 20%)", borderRadius: "10px", padding: "10px 36px 10px 14px", color: "white", fontSize: "13px", outline: "none", cursor: "pointer", appearance: "none" as const, minWidth: "160px" }}>
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
              ))}
            </select>
            <span style={{ position: "absolute" as const, right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "hsl(220 15% 55%)" }}>▼</span>
          </div>

          {/* Fetch button */}
          <button onClick={fetchFreshJobs} disabled={fetching}
            style={{ background: fetching ? "hsl(228 20% 14%)" : "linear-gradient(135deg, #7c6ff0, #a78bfa)", color: "white", padding: "10px 20px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", border: "none", cursor: fetching ? "not-allowed" : "pointer", opacity: fetching ? 0.7 : 1, whiteSpace: "nowrap" as const }}>
            {fetching ? "⏳ Fetching..." : "🔍 Fetch Jobs"}
          </button>

          {/* AI Match */}
          <button onClick={scoreJobs} disabled={scoring || allJobs.length === 0}
            style={{ background: scoring ? "hsl(228 20% 14%)" : "rgba(124,111,240,0.2)", color: "#9b8ff4", padding: "10px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", border: "1px solid rgba(124,111,240,0.3)", cursor: scoring ? "not-allowed" : "pointer", opacity: scoring ? 0.7 : 1, whiteSpace: "nowrap" as const }}>
            {scoring ? "⏳ Scoring..." : "✨ AI Match"}
          </button>

          {/* Refresh */}
          <button onClick={() => loadJobs(userId, "")}
            style={{ background: "transparent", color: "hsl(220 15% 55%)", padding: "10px 16px", borderRadius: "10px", fontSize: "13px", border: "1px solid hsl(228 20% 20%)", cursor: "pointer" }}>
            🔄 Refresh
          </button>
        </div>

        {/* Country hint */}
        <div style={{ marginTop: "10px", fontSize: "12px", color: "hsl(220 15% 40%)" }}>
          {country === "REMOTE" ? "🌍 Showing remote jobs from worldwide sources" :
           country === "US" ? "🇺🇸 Showing US onsite + worldwide remote jobs" :
           `${COUNTRIES.find(c => c.code === country)?.flag} Showing jobs in ${COUNTRIES.find(c => c.code === country)?.name} + worldwide remote`}
          {" · "}Sources: LinkedIn · Indeed · Glassdoor · Remotive · Jobicy · Greenhouse · Lever
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" as const, alignItems: "center" }}>
        {/* Search filter */}
        <input
          style={{ background: "hsl(228 25% 8%)", border: "1px solid hsl(228 20% 16%)", borderRadius: "8px", padding: "7px 14px", color: "white", fontSize: "13px", outline: "none", width: "200px" }}
          placeholder="Filter by title or company..."
          value={search} onChange={e => setSearch(e.target.value)}
        />

        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ background: "hsl(228 25% 8%)", border: "1px solid hsl(228 20% 16%)", borderRadius: "8px", padding: "7px 12px", color: "white", fontSize: "13px", outline: "none", cursor: "pointer" }}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="match">AI Match Score</option>
          <option value="company">Company A-Z</option>
        </select>

        <div style={{ width: "1px", background: "hsl(228 20% 18%)", height: "24px" }} />

        {["all", "remote", "hybrid", "onsite"].map(v => (
          <button key={v} style={filterBtn(workModeFilter === v)} onClick={() => setWorkModeFilter(v)}>
            {v === "all" ? "All modes" : v}
          </button>
        ))}

        <div style={{ width: "1px", background: "hsl(228 20% 18%)", height: "24px" }} />

        {["all", "full_time", "contract", "part_time"].map(v => (
          <button key={v} style={filterBtn(typeFilter === v)} onClick={() => setTypeFilter(v)}>
            {v === "all" ? "All types" : v.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Message */}
      {message && (
        <div style={{ padding: "12px 16px", background: message.startsWith("Error") ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", border: `1px solid ${message.startsWith("Error") ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`, borderRadius: "8px", color: message.startsWith("Error") ? "#f87171" : "#4ade80", fontSize: "13px", marginBottom: "16px" }}>
          {message}
        </div>
      )}

      {/* Jobs grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "64px", color: "hsl(220 15% 45%)" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
          <div>Loading jobs...</div>
        </div>
      ) : paginatedJobs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px", color: "hsl(220 15% 45%)" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
          <p style={{ fontSize: "16px", marginBottom: "8px", color: "white" }}>No jobs found</p>
          <p style={{ fontSize: "13px", marginBottom: "20px" }}>
            {fetchQuery ? `No "${fetchQuery}" jobs in database yet` : "No jobs in database yet"}
          </p>
          <button onClick={fetchFreshJobs} disabled={fetching}
            style={{ background: "linear-gradient(135deg, #7c6ff0, #a78bfa)", color: "white", padding: "12px 28px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", border: "none", cursor: "pointer" }}>
            🔍 Fetch {fetchQuery || "Jobs"} Now
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "14px", marginBottom: "28px" }}>
            {paginatedJobs.map(job => {
              const mc = matchColor(job.ai_match_score)
              const saved = savedIds.has(job.id)
              const isSaving = savingId === job.id
              const sc = sourceColor[job.source] || sourceColor.other
              return (
                <div key={job.id}
                  style={{ background: "hsl(228 25% 8%)", border: `1px solid ${isFresh(job.posted_at) ? "rgba(74,222,128,0.3)" : "hsl(228 20% 14%)"}`, borderRadius: "12px", padding: "18px", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(124,111,240,0.4)"; e.currentTarget.style.transform = "translateY(-1px)" }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = isFresh(job.posted_at) ? "rgba(74,222,128,0.3)" : "hsl(228 20% 14%)"; e.currentTarget.style.transform = "translateY(0)" }}>

                  {/* Top row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {isFresh(job.posted_at) && <span style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "20px" }}>NEW</span>}
                      {mc && job.ai_match_score && <span style={{ background: mc.bg, color: mc.color, fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "20px" }}>{job.ai_match_score}% match</span>}
                    </div>
                    <button onClick={() => toggleSave(job)} disabled={isSaving}
                      style={{ background: saved ? "rgba(124,111,240,0.2)" : "transparent", border: saved ? "1px solid rgba(124,111,240,0.4)" : "1px solid hsl(228 20% 22%)", borderRadius: "8px", padding: "4px 10px", cursor: isSaving ? "wait" : "pointer", fontSize: "12px", color: saved ? "#9b8ff4" : "hsl(220 15% 50%)", fontWeight: "600" as const }}>
                      {isSaving ? "..." : saved ? "★ Saved" : "☆ Save"}
                    </button>
                  </div>

                  {/* Company + Title */}
                  <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                    {job.company_logo ? (
                      <img src={job.company_logo} alt={job.company} style={{ width: "36px", height: "36px", borderRadius: "8px", objectFit: "contain", background: "white", padding: "2px", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(124,111,240,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "700", color: "#9b8ff4", flexShrink: 0 }}>
                        {job.company?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "white", marginBottom: "2px", lineHeight: "1.3" }}>{job.title}</div>
                      <div style={{ fontSize: "12px", color: "hsl(220 15% 55%)" }}>{job.company} · {job.location}</div>
                    </div>
                  </div>

                  {/* Badges */}
                  <div style={{ marginBottom: "12px" }}>
                    <span style={badge(job.work_mode, job.work_mode === "remote" ? "#4ade80" : "#9b8ff4", job.work_mode === "remote" ? "rgba(74,222,128,0.12)" : "rgba(124,111,240,0.12)")}>{job.work_mode}</span>
                    <span style={badge(job.job_type?.replace("_", " "), "#9b8ff4", "rgba(124,111,240,0.12)")}>{job.job_type?.replace("_", " ")}</span>
                    <span style={badge(job.source, sc.color, sc.bg)}>{job.source}</span>
                    {job.salary_min && <span style={badge(`$${Math.round(job.salary_min / 1000)}k+`, "#fbbf24", "rgba(251,191,36,0.12)")}>${Math.round(job.salary_min / 1000)}k+</span>}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <span style={{ fontSize: "11px", color: "hsl(220 15% 40%)" }}>🕐 {timeAgo(job.posted_at)}</span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => sendToResume(job)}
                        style={{ background: "rgba(124,111,240,0.15)", color: "#9b8ff4", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", border: "1px solid rgba(124,111,240,0.25)", cursor: "pointer" }}>
                        AI Resume
                      </button>
                      <button onClick={() => applyAndTrack(job)}
                        style={{ background: "linear-gradient(135deg, #7c6ff0, #a78bfa)", color: "white", padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", border: "none", cursor: "pointer" }}>
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
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", flexWrap: "wrap" as const }}>
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} style={pageBtn(false, currentPage === 1)}>«</button>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={pageBtn(false, currentPage === 1)}>‹ Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .reduce((acc: (number | string)[], p, i, arr) => {
                  if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("...")
                  acc.push(p); return acc
                }, [])
                .map((p, i) => (
                  <button key={i} onClick={() => typeof p === "number" && setCurrentPage(p)} disabled={p === "..."}
                    style={pageBtn(p === currentPage, p === "...")}>{p}</button>
                ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={pageBtn(false, currentPage === totalPages)}>Next ›</button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} style={pageBtn(false, currentPage === totalPages)}>»</button>
              <span style={{ fontSize: "12px", color: "hsl(220 15% 40%)", marginLeft: "8px" }}>
                Page {currentPage} of {totalPages} · {filteredJobs.length} jobs
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}