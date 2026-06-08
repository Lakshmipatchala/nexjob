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
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "FR", name: "France", flag: "🇫🇷" },
]

const DOMAINS = [
  "All Domains", "Software Engineering", "Data & AI", "DevOps & Cloud",
  "QA & Testing", "Product & Design", "Cybersecurity", "Mobile Development",
  "Frontend", "Backend", "Full Stack", "Machine Learning", "Data Science",
  "Blockchain", "Embedded Systems", "IT Support"
]

const EXPERIENCE_LEVELS = [
  { value: "all", label: "Any Level" },
  { value: "entry", label: "Entry (0-2 yrs)" },
  { value: "mid", label: "Mid (2-5 yrs)" },
  { value: "senior", label: "Senior (5+ yrs)" },
  { value: "lead", label: "Lead / Manager" },
]

const DATE_FILTERS = [
  { value: "all", label: "Any time" },
  { value: "1", label: "Last 24h" },
  { value: "3", label: "Last 3 days" },
  { value: "7", label: "Last 7 days" },
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
  const [fetchQuery, setFetchQuery] = useState(lastJobSearch || "software engineer")
  const [country, setCountry] = useState("US")
  const [message, setMessage] = useState("")
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [savingId, setSavingId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(true)
  // Filters
  const [workMode, setWorkMode] = useState("all")
  const [jobType, setJobType] = useState("all")
  const [domain, setDomain] = useState("All Domains")
  const [experience, setExperience] = useState("all")
  const [dateFilter, setDateFilter] = useState("7")
  const [salaryMin, setSalaryMin] = useState("")
  const [titleSearch, setTitleSearch] = useState("")
  const [sortBy, setSortBy] = useState("newest")

  useEffect(() => { initUser() }, [])
  useEffect(() => { setCurrentPage(1) }, [workMode, jobType, domain, experience, dateFilter, salaryMin, titleSearch])
  useEffect(() => { loadJobs(userId, fetchQuery, country) }, [country])

  async function initUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      loadSavedViaAPI(user.id)
      loadJobs(user.id, lastJobSearch || "", "US")
    } else {
      loadJobs("", lastJobSearch || "", "US")
    }
  }

  async function loadJobs(uid?: string, q?: string, c?: string) {
    setLoading(true)
    const id = uid !== undefined ? uid : userId
    const currentCountry = c !== undefined ? c : country
    const params = new URLSearchParams()
    if (id) params.set("userId", id)
    if (q && q.trim()) params.set("query", q.trim())
    if (currentCountry) params.set("country", currentCountry)
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
    setMessage(`Fetching "${fetchQuery}" jobs...`)
    try {
      const params = new URLSearchParams({ query: fetchQuery, country })
      const res = await fetch(`/api/jobs/fetch?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setMessage(data.message || "Done!")
        await loadJobs(userId, fetchQuery, country)
        setTimeout(() => setMessage(""), 5000)
      } else setMessage(`Error: ${data.error}`)
    } catch (e: any) { setMessage(`Error: ${e.message}`) }
    setFetching(false)
  }

  async function scoreJobs() {
    if (scoring || allJobs.length === 0) return
    setScoring(true)
    setMessage("AI scoring jobs...")
    try {
      const res = await fetch("/api/jobs/score", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobs: filteredJobs.slice(0, 20) })
      })
      const data = await res.json()
      if (data.scores) {
        setAllJobs(prev => prev.map(j => ({ ...j, ai_match_score: data.scores[j.id] ?? j.ai_match_score })))
        setMessage("AI scores updated!")
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
        setMessage("Saved!"); setTimeout(() => setMessage(""), 2000)
      }
    } catch (e) { console.error(e) }
    setSavingId(null)
  }

  function sendToResume(job: Job) {
    setPrefilledJob({ jobTitle: job.title, company: job.company, jobDescription: job.description || "" })
    router.push("/dashboard/resume")
  }

  function oneClickApply(job: Job) {
    const params = new URLSearchParams({ jobId: job.id, title: job.title, company: job.company, url: job.source_url || "", source: job.source, description: (job.description || "").slice(0, 500) })
    router.push(`/dashboard/apply?${params.toString()}`)
  }

  async function applyAndTrack(job: Job) {
    window.open(job.source_url, "_blank")
    if (!userId) return
    await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, jobId: job.id, jobData: job, status: "applied" }) })
    setAllJobs(prev => prev.filter(j => j.id !== job.id))
    setMessage("Applied!"); setTimeout(() => setMessage(""), 3000)
  }

  function matchesDomain(title: string): boolean {
    if (domain === "All Domains") return true
    const t = title.toLowerCase()
    const map: Record<string, string[]> = {
      "Software Engineering": ["software","engineer","developer","swe","sde"],
      "Data & AI": ["data","ai","analytics","etl","warehouse","pipeline","spark","kafka","databricks","snowflake","dbt"],
      "DevOps & Cloud": ["devops","cloud","aws","azure","gcp","kubernetes","docker","terraform","sre","platform","infrastructure"],
      "QA & Testing": ["qa","quality","test","sdet","automation","selenium"],
      "Product & Design": ["product","design","ux","ui","designer","manager"],
      "Cybersecurity": ["security","cyber","infosec","penetration","soc","vulnerability"],
      "Mobile Development": ["mobile","ios","android","react native","flutter","swift","kotlin"],
      "Frontend": ["frontend","front-end","react","angular","vue","nextjs","typescript","javascript","css","html"],
      "Backend": ["backend","back-end","java","python","nodejs","golang","ruby","scala","php","rust","c++"],
      "Full Stack": ["full stack","fullstack","full-stack","mern","mean"],
      "Machine Learning": ["machine learning","ml","deep learning","nlp","computer vision","llm","ai engineer"],
      "Data Science": ["data scientist","data science","statistics","research scientist","applied scientist"],
      "Blockchain": ["blockchain","web3","smart contract","solidity","crypto","defi"],
      "Embedded Systems": ["embedded","firmware","iot","fpga","rtos","hardware"],
      "IT Support": ["support","helpdesk","it admin","sysadmin","network","systems admin"],
    }
    return (map[domain] || []).some(k => t.includes(k))
  }

  function matchesExperience(title: string): boolean {
    if (experience === "all") return true
    const t = title.toLowerCase()
    if (experience === "entry") return t.includes("junior") || t.includes("entry") || t.includes("associate") || t.includes("graduate") || t.includes("intern")
    if (experience === "mid") return !t.includes("senior") && !t.includes("staff") && !t.includes("principal") && !t.includes("lead") && !t.includes("manager") && !t.includes("director") && !t.includes("junior") && !t.includes("intern")
    if (experience === "senior") return t.includes("senior") || t.includes("sr.") || t.includes("staff")
    if (experience === "lead") return t.includes("lead") || t.includes("manager") || t.includes("principal") || t.includes("director") || t.includes("head of") || t.includes("vp")
    return true
  }

  const filteredJobs = allJobs.filter(j => {
    if (workMode !== "all" && j.work_mode !== workMode) return false
    if (jobType !== "all" && j.job_type !== jobType) return false
    if (!matchesDomain(j.title)) return false
    if (!matchesExperience(j.title)) return false
    if (dateFilter !== "all") {
      const days = parseInt(dateFilter)
      const posted = new Date(j.posted_at)
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      if (posted < cutoff) return false
    }
    if (salaryMin && j.salary_min && j.salary_min < parseInt(salaryMin) * 1000) return false
    if (titleSearch && !j.title.toLowerCase().includes(titleSearch.toLowerCase()) && !j.company.toLowerCase().includes(titleSearch.toLowerCase())) return false
    return true
  }).sort((a, b) => {
    if (sortBy === "newest") return new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime()
    if (sortBy === "oldest") return new Date(a.posted_at).getTime() - new Date(b.posted_at).getTime()
    if (sortBy === "match") return (b.ai_match_score || 0) - (a.ai_match_score || 0)
    if (sortBy === "salary") return (b.salary_min || 0) - (a.salary_min || 0)
    if (sortBy === "company") return a.company.localeCompare(b.company)
    return 0
  })

  const totalPages = Math.ceil(filteredJobs.length / JOBS_PER_PAGE)
  const paginatedJobs = filteredJobs.slice((currentPage - 1) * JOBS_PER_PAGE, currentPage * JOBS_PER_PAGE)

  const activeFilters = [
    workMode !== "all" && workMode,
    jobType !== "all" && jobType.replace("_"," "),
    domain !== "All Domains" && domain,
    experience !== "all" && EXPERIENCE_LEVELS.find(e=>e.value===experience)?.label,
    dateFilter !== "all" && DATE_FILTERS.find(d=>d.value===dateFilter)?.label,
    salaryMin && `$${salaryMin}k+`,
  ].filter(Boolean) as string[]

  function clearFilters() {
    setWorkMode("all"); setJobType("all"); setDomain("All Domains")
    setExperience("all"); setDateFilter("7"); setSalaryMin("")
    setTitleSearch(""); setSortBy("newest")
  }

  const badge = (text: string, color: string, bg: string) => ({
    display: "inline-block" as const, fontSize: "11px", padding: "3px 8px",
    borderRadius: "20px", marginRight: "5px", background: bg, color, fontWeight: "500" as const
  })

  const srcColor: Record<string, { color: string, bg: string }> = {
    linkedin:   { color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
    indeed:     { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
    glassdoor:  { color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
    remotive:   { color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
    adzuna:     { color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
    dice:       { color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
    greenhouse: { color: "#34d399", bg: "rgba(52,211,153,0.12)" },
    lever:      { color: "#f87171", bg: "rgba(248,113,113,0.12)" },
    jobicy:     { color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
    monster:    { color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
    naukri:     { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
    other:      { color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  }

  const pageBtn = (active: boolean, disabled?: boolean) => ({
    padding: "6px 12px", borderRadius: "8px",
    border: active ? "none" : "1px solid hsl(228 20% 20%)",
    background: active ? "#7c6ff0" : "transparent",
    color: active ? "white" : disabled ? "hsl(220 15% 30%)" : "hsl(220 15% 60%)",
    fontSize: "13px", fontWeight: "600" as const,
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1
  })

  const sel = (val: string, options: {value:string,label:string}[], setter: (v:string)=>void) => (
    <select value={val} onChange={e=>setter(e.target.value)}
      style={{ background: "hsl(228 25% 10%)", border: "1px solid hsl(228 20% 18%)", borderRadius: "8px", padding: "7px 10px", color: "white", fontSize: "12px", outline: "none", cursor: "pointer", width: "100%" }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )

  return (
    <div style={{ minHeight: "100vh", background: "hsl(224 71% 4%)", display: "flex", gap: "0" }}>

      {/* LEFT FILTER PANEL */}
      {showFilters && (
        <div style={{ width: "260px", minWidth: "260px", background: "hsl(228 25% 7%)", borderRight: "1px solid hsl(228 20% 13%)", padding: "20px 16px", overflowY: "auto" as const, height: "100vh", position: "sticky" as const, top: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <span style={{ fontSize: "14px", fontWeight: "700", color: "white" }}>🎛️ Refine Results</span>
            {activeFilters.length > 0 && (
              <button onClick={clearFilters} style={{ background: "rgba(248,113,113,0.15)", color: "#f87171", border: "none", borderRadius: "6px", padding: "3px 8px", fontSize: "11px", cursor: "pointer" }}>
                Clear all
              </button>
            )}
          </div>

          {/* Active filters */}
          {activeFilters.length > 0 && (
            <div style={{ marginBottom: "16px", display: "flex", flexWrap: "wrap" as const, gap: "4px" }}>
              {activeFilters.map(f => (
                <span key={f} style={{ background: "rgba(124,111,240,0.2)", color: "#9b8ff4", fontSize: "11px", padding: "2px 8px", borderRadius: "20px", border: "1px solid rgba(124,111,240,0.3)" }}>
                  {f}
                </span>
              ))}
            </div>
          )}

          {/* Country */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "11px", fontWeight: "600", color: "hsl(220 15% 45%)", textTransform: "uppercase" as const, letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>🌍 Country / Region</label>
            <select value={country} onChange={e=>setCountry(e.target.value)}
              style={{ background: "hsl(228 25% 10%)", border: "1px solid hsl(228 20% 18%)", borderRadius: "8px", padding: "7px 10px", color: "white", fontSize: "12px", outline: "none", cursor: "pointer", width: "100%" }}>
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
            </select>
          </div>

          {/* Domain */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "11px", fontWeight: "600", color: "hsl(220 15% 45%)", textTransform: "uppercase" as const, letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>💼 Domain</label>
            <select value={domain} onChange={e=>setDomain(e.target.value)}
              style={{ background: "hsl(228 25% 10%)", border: "1px solid hsl(228 20% 18%)", borderRadius: "8px", padding: "7px 10px", color: "white", fontSize: "12px", outline: "none", cursor: "pointer", width: "100%" }}>
              {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Experience */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "11px", fontWeight: "600", color: "hsl(220 15% 45%)", textTransform: "uppercase" as const, letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>📊 Experience</label>
            {sel(experience, EXPERIENCE_LEVELS, setExperience)}
          </div>

          {/* Work mode */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "11px", fontWeight: "600", color: "hsl(220 15% 45%)", textTransform: "uppercase" as const, letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>🏠 Work Mode</label>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "4px" }}>
              {[["all","All Modes"],["remote","Remote"],["hybrid","Hybrid"],["onsite","Onsite"]].map(([v,l]) => (
                <button key={v} onClick={()=>setWorkMode(v)}
                  style={{ textAlign: "left" as const, padding: "7px 10px", borderRadius: "7px", border: workMode===v ? "1px solid rgba(124,111,240,0.4)" : "1px solid transparent", background: workMode===v ? "rgba(124,111,240,0.15)" : "transparent", color: workMode===v ? "#9b8ff4" : "hsl(220 15% 60%)", fontSize: "12px", cursor: "pointer", fontWeight: workMode===v ? "600" : "400" as const }}>
                  {workMode===v ? "● " : "○ "}{l}
                </button>
              ))}
            </div>
          </div>

          {/* Job type */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "11px", fontWeight: "600", color: "hsl(220 15% 45%)", textTransform: "uppercase" as const, letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>📋 Job Type</label>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "4px" }}>
              {[["all","All Types"],["full_time","Full Time"],["contract","Contract"],["part_time","Part Time"]].map(([v,l]) => (
                <button key={v} onClick={()=>setJobType(v)}
                  style={{ textAlign: "left" as const, padding: "7px 10px", borderRadius: "7px", border: jobType===v ? "1px solid rgba(124,111,240,0.4)" : "1px solid transparent", background: jobType===v ? "rgba(124,111,240,0.15)" : "transparent", color: jobType===v ? "#9b8ff4" : "hsl(220 15% 60%)", fontSize: "12px", cursor: "pointer", fontWeight: jobType===v ? "600" : "400" as const }}>
                  {jobType===v ? "● " : "○ "}{l}
                </button>
              ))}
            </div>
          </div>

          {/* Date posted */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "11px", fontWeight: "600", color: "hsl(220 15% 45%)", textTransform: "uppercase" as const, letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>📅 Date Posted</label>
            {sel(dateFilter, DATE_FILTERS, setDateFilter)}
          </div>

          {/* Salary */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "11px", fontWeight: "600", color: "hsl(220 15% 45%)", textTransform: "uppercase" as const, letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>💰 Min Salary (USD)</label>
            <select value={salaryMin} onChange={e=>setSalaryMin(e.target.value)}
              style={{ background: "hsl(228 25% 10%)", border: "1px solid hsl(228 20% 18%)", borderRadius: "8px", padding: "7px 10px", color: "white", fontSize: "12px", outline: "none", cursor: "pointer", width: "100%" }}>
              <option value="">No minimum</option>
              <option value="50">$50k+</option>
              <option value="80">$80k+</option>
              <option value="100">$100k+</option>
              <option value="120">$120k+</option>
              <option value="150">$150k+</option>
              <option value="200">$200k+</option>
            </select>
          </div>

          {/* Sort */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "11px", fontWeight: "600", color: "hsl(220 15% 45%)", textTransform: "uppercase" as const, letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>↕️ Sort By</label>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
              style={{ background: "hsl(228 25% 10%)", border: "1px solid hsl(228 20% 18%)", borderRadius: "8px", padding: "7px 10px", color: "white", fontSize: "12px", outline: "none", cursor: "pointer", width: "100%" }}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="match">AI Match Score</option>
              <option value="salary">Highest Salary</option>
              <option value="company">Company A-Z</option>
            </select>
          </div>

          {/* Stats */}
          <div style={{ marginTop: "20px", padding: "12px", background: "hsl(228 25% 10%)", borderRadius: "8px", fontSize: "12px", color: "hsl(220 15% 50%)", textAlign: "center" as const }}>
            <div style={{ fontSize: "20px", fontWeight: "700", color: "white" }}>{filteredJobs.length}</div>
            <div>jobs match your filters</div>
            <div style={{ fontSize: "11px", marginTop: "4px" }}>{allJobs.length} total in database</div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, minWidth: 0, padding: "24px 24px" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap" as const, gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button onClick={()=>setShowFilters(!showFilters)}
              style={{ background: showFilters ? "rgba(124,111,240,0.15)" : "hsl(228 25% 10%)", border: showFilters ? "1px solid rgba(124,111,240,0.3)" : "1px solid hsl(228 20% 18%)", borderRadius: "8px", padding: "7px 12px", color: showFilters ? "#9b8ff4" : "hsl(220 15% 60%)", fontSize: "12px", cursor: "pointer", fontWeight: "600" as const }}>
              🎛️ {showFilters ? "Hide" : "Show"} Filters
            </button>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: "700", color: "white", margin: 0 }}>Browse Jobs</h1>
              <p style={{ color: "hsl(220 15% 50%)", fontSize: "12px", margin: 0 }}>
                Showing {filteredJobs.length} of {allJobs.length} jobs
                {activeFilters.length > 0 && <span style={{ color: "#9b8ff4" }}> · {activeFilters.length} filter{activeFilters.length>1?"s":""} active</span>}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" as const }}>
            <input value={fetchQuery} onChange={e=>setFetchQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&fetchFreshJobs()}
              placeholder="Search role..."
              style={{ background: "hsl(228 25% 10%)", border: "1px solid hsl(228 20% 18%)", borderRadius: "8px", padding: "7px 12px", color: "white", fontSize: "13px", outline: "none", width: "160px" }} />
            <button onClick={fetchFreshJobs} disabled={fetching}
              style={{ background: fetching?"hsl(228 20% 14%)":"linear-gradient(135deg,#7c6ff0,#a78bfa)", color: "white", padding: "7px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", border: "none", cursor: fetching?"not-allowed":"pointer", opacity: fetching?0.7:1, whiteSpace: "nowrap" as const }}>
              {fetching?"⏳ Fetching...":"🔍 Fetch Jobs"}
            </button>
            <button onClick={scoreJobs} disabled={scoring||allJobs.length===0}
              style={{ background: "rgba(124,111,240,0.12)", color: "#9b8ff4", padding: "7px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", border: "1px solid rgba(124,111,240,0.25)", cursor: scoring?"not-allowed":"pointer", opacity: scoring?0.7:1, whiteSpace: "nowrap" as const }}>
              {scoring?"⏳":"✨"} AI Match
            </button>
            <button onClick={()=>loadJobs(userId,"",country)}
              style={{ background: "transparent", color: "hsl(220 15% 55%)", padding: "7px 12px", borderRadius: "8px", fontSize: "13px", border: "1px solid hsl(228 20% 18%)", cursor: "pointer" }}>
              🔄
            </button>
          </div>
        </div>

        {/* Title search */}
        <div style={{ marginBottom: "14px" }}>
          <input value={titleSearch} onChange={e=>setTitleSearch(e.target.value)}
            placeholder="Filter by title or company..."
            style={{ width: "100%", background: "hsl(228 25% 8%)", border: "1px solid hsl(228 20% 15%)", borderRadius: "8px", padding: "9px 14px", color: "white", fontSize: "13px", outline: "none", boxSizing: "border-box" as const }} />
        </div>

        {message && (
          <div style={{ padding: "10px 14px", background: message.startsWith("Error")?"rgba(239,68,68,0.1)":"rgba(34,197,94,0.1)", border: `1px solid ${message.startsWith("Error")?"rgba(239,68,68,0.3)":"rgba(34,197,94,0.3)"}`, borderRadius: "8px", color: message.startsWith("Error")?"#f87171":"#4ade80", fontSize: "13px", marginBottom: "14px" }}>
            {message}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center" as const, padding: "64px", color: "hsl(220 15% 45%)" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>Loading...
          </div>
        ) : paginatedJobs.length === 0 ? (
          <div style={{ textAlign: "center" as const, padding: "48px", color: "hsl(220 15% 45%)" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔍</div>
            <p style={{ fontSize: "16px", color: "white", marginBottom: "6px" }}>No jobs found</p>
            <p style={{ fontSize: "13px", marginBottom: "16px" }}>
              {activeFilters.length > 0 ? "Try clearing some filters" : `Click Fetch Jobs to load "${fetchQuery}"`}
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" as const }}>
              {activeFilters.length > 0 && <button onClick={clearFilters} style={{ background: "rgba(124,111,240,0.2)", color: "#9b8ff4", padding: "10px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", border: "1px solid rgba(124,111,240,0.3)", cursor: "pointer" }}>Clear Filters</button>}
              <button onClick={fetchFreshJobs} disabled={fetching} style={{ background: "linear-gradient(135deg,#7c6ff0,#a78bfa)", color: "white", padding: "10px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", border: "none", cursor: "pointer" }}>Fetch Jobs Now</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px", marginBottom: "20px" }}>
              {paginatedJobs.map(job => {
                const saved = savedIds.has(job.id)
                const isSaving = savingId === job.id
                const sc = srcColor[job.source] || srcColor.other
                const mc = job.ai_match_score ? job.ai_match_score>=80?{bg:"rgba(34,197,94,0.15)",color:"#4ade80"}:job.ai_match_score>=60?{bg:"rgba(251,191,36,0.15)",color:"#fbbf24"}:{bg:"rgba(248,113,113,0.15)",color:"#f87171"} : null
                return (
                  <div key={job.id}
                    style={{ background: "hsl(228 25% 8%)", border: `1px solid ${isFresh(job.posted_at)?"rgba(74,222,128,0.25)":"hsl(228 20% 14%)"}`, borderRadius: "12px", padding: "16px", transition: "all 0.15s" }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(124,111,240,0.4)";e.currentTarget.style.transform="translateY(-1px)"}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=isFresh(job.posted_at)?"rgba(74,222,128,0.25)":"hsl(228 20% 14%)";e.currentTarget.style.transform="translateY(0)"}}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                      <div style={{ display: "flex", gap: "5px" }}>
                        {isFresh(job.posted_at) && <span style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", fontSize: "10px", fontWeight: "700", padding: "2px 7px", borderRadius: "20px" }}>NEW</span>}
                        {mc && <span style={{ background: mc.bg, color: mc.color, fontSize: "10px", fontWeight: "700", padding: "2px 7px", borderRadius: "20px" }}>{job.ai_match_score}%</span>}
                      </div>
                      <button onClick={()=>toggleSave(job)} disabled={isSaving}
                        style={{ background: saved?"rgba(124,111,240,0.2)":"transparent", border: saved?"1px solid rgba(124,111,240,0.4)":"1px solid hsl(228 20% 22%)", borderRadius: "6px", padding: "3px 8px", cursor: "pointer", fontSize: "11px", color: saved?"#9b8ff4":"hsl(220 15% 50%)", fontWeight: "600" as const }}>
                        {isSaving?"...":saved?"★":"☆ Save"}
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                      {job.company_logo
                        ?<img src={job.company_logo} alt="" style={{ width:"34px",height:"34px",borderRadius:"8px",objectFit:"contain",background:"white",padding:"2px",flexShrink:0 }}/>
                        :<div style={{ width:"34px",height:"34px",borderRadius:"8px",background:"rgba(124,111,240,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",fontWeight:"700",color:"#9b8ff4",flexShrink:0 }}>{job.company?.[0]?.toUpperCase()}</div>
                      }
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:"13px",fontWeight:"600",color:"white",marginBottom:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const }}>{job.title}</div>
                        <div style={{ fontSize:"11px",color:"hsl(220 15% 55%)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const }}>{job.company} · {job.location}</div>
                      </div>
                    </div>
                    <div style={{ marginBottom:"10px" }}>
                      <span style={badge(job.work_mode,job.work_mode==="remote"?"#4ade80":"#9b8ff4",job.work_mode==="remote"?"rgba(74,222,128,0.12)":"rgba(124,111,240,0.12)")}>{job.work_mode}</span>
                      <span style={badge(job.job_type?.replace("_"," "),"#9b8ff4","rgba(124,111,240,0.12)")}>{job.job_type?.replace("_"," ")}</span>
                      <span style={badge(job.source,sc.color,sc.bg)}>{job.source}</span>
                      {job.salary_min&&<span style={badge(`$${Math.round(job.salary_min/1000)}k`,"#fbbf24","rgba(251,191,36,0.12)")}>${Math.round(job.salary_min/1000)}k</span>}
                    </div>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:"6px" }}>
                      <span style={{ fontSize:"11px",color:"hsl(220 15% 40%)" }}>🕐 {timeAgo(job.posted_at)}</span>
                      <div style={{ display:"flex",gap:"5px" }}>
                        <button onClick={()=>sendToResume(job)} style={{ background:"rgba(124,111,240,0.12)",color:"#9b8ff4",padding:"5px 8px",borderRadius:"6px",fontSize:"11px",fontWeight:"600",border:"1px solid rgba(124,111,240,0.2)",cursor:"pointer" }}>AI Resume</button>
                        <button onClick={()=>oneClickApply(job)} style={{ background:"linear-gradient(135deg,#059669,#10b981)",color:"white",padding:"5px 8px",borderRadius:"6px",fontSize:"11px",fontWeight:"600",border:"none",cursor:"pointer" }}>⚡ 1-Click</button>
                        <button onClick={()=>applyAndTrack(job)} style={{ background:"linear-gradient(135deg,#7c6ff0,#a78bfa)",color:"white",padding:"5px 8px",borderRadius:"6px",fontSize:"11px",fontWeight:"600",border:"none",cursor:"pointer" }}>Apply →</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {totalPages>1&&(
              <div style={{ display:"flex",justifyContent:"center",alignItems:"center",gap:"6px",flexWrap:"wrap" as const }}>
                <button onClick={()=>setCurrentPage(1)} disabled={currentPage===1} style={pageBtn(false,currentPage===1)}>«</button>
                <button onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1} style={pageBtn(false,currentPage===1)}>‹</button>
                {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-currentPage)<=2).reduce((acc:(number|string)[],p,i,arr)=>{if(i>0&&(p as number)-(arr[i-1] as number)>1)acc.push("...");acc.push(p);return acc},[]).map((p,i)=>(<button key={i} onClick={()=>typeof p==="number"&&setCurrentPage(p)} disabled={p==="..."} style={pageBtn(p===currentPage,p==="...")}>{p}</button>))}
                <button onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages} style={pageBtn(false,currentPage===totalPages)}>›</button>
                <button onClick={()=>setCurrentPage(totalPages)} disabled={currentPage===totalPages} style={pageBtn(false,currentPage===totalPages)}>»</button>
                <span style={{ fontSize:"12px",color:"hsl(220 15% 40%)",marginLeft:"6px" }}>{currentPage}/{totalPages} · {filteredJobs.length} jobs</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
