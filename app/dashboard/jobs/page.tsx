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
  { code: "US", name: "United States" },
  { code: "REMOTE", name: "Remote (Worldwide)" },
  { code: "IN", name: "India" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "SG", name: "Singapore" },
  { code: "AE", name: "UAE" },
  { code: "NL", name: "Netherlands" },
  { code: "FR", name: "France" },
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
  { value: "15", label: "Last 15 days" },
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
  const [workMode, setWorkMode] = useState("all")
  const [jobType, setJobType] = useState("all")
  const [domain, setDomain] = useState("All Domains")
  const [experience, setExperience] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [salaryMin, setSalaryMin] = useState("")
  const [titleSearch, setTitleSearch] = useState("")
  const [sortBy, setSortBy] = useState("newest")

  useEffect(() => { initUser() }, [])
  useEffect(() => { setCurrentPage(1) }, [workMode, jobType, domain, experience, dateFilter, salaryMin, titleSearch, sortBy])

  async function initUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      loadSavedViaAPI(user.id)
      loadJobs(user.id, "")
    } else {
      loadJobs("", "")
    }
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
    setMessage(`Fetching "${fetchQuery}" jobs...`)
    try {
      const params = new URLSearchParams({ query: fetchQuery, country })
      const res = await fetch(`/api/jobs/fetch?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setMessage(data.message || "Done!")
        await loadJobs(userId, "")
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
        setMessage("Saved!")
        setTimeout(() => setMessage(""), 2000)
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
    setMessage(`Applied!`)
    setTimeout(() => setMessage(""), 3000)
  }

  function clearFilters() {
    setWorkMode("all"); setJobType("all"); setDomain("All Domains")
    setExperience("all"); setDateFilter("all"); setSalaryMin("")
    setTitleSearch(""); setSortBy("newest")
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

  const COUNTRY_KW: Record<string,string[]> = {
    US: ["united states","usa",", us",", al",", ak",", az",", ar",", ca",", co",", ct",", de",", fl",", ga",", hi",", id",", il",", in",", ia",", ks",", ky",", la",", me",", md",", ma",", mi",", mn",", ms",", mo",", mt",", ne",", nv",", nh",", nj",", nm",", ny",", nc",", nd",", oh",", ok",", or",", pa",", ri",", sc",", sd",", tn",", tx",", ut",", vt",", va",", wa",", wv",", wi",", wy",", dc","new york","san francisco","los angeles","chicago","seattle","boston","austin","denver","atlanta","dallas","houston","remote"],
    IN: ["india","bengaluru","bangalore","mumbai","delhi","hyderabad","pune","chennai","gurugram","noida","remote"],
    GB: ["united kingdom","uk","london","manchester","birmingham","remote"],
    CA: ["canada","toronto","vancouver","montreal","ottawa","remote"],
    AU: ["australia","sydney","melbourne","brisbane","remote"],
    DE: ["germany","berlin","munich","frankfurt","hamburg","remote"],
    SG: ["singapore","remote"],
    AE: ["uae","dubai","abu dhabi","remote"],
    NL: ["netherlands","amsterdam","remote"],
    FR: ["france","paris","lyon","remote"],
    REMOTE: ["remote","worldwide","anywhere","global"],
  }

  const filteredJobs = allJobs.filter(j => {
    if (country === "REMOTE") {
      if (j.work_mode !== "remote") return false
    } else if (country !== "US") {
      const loc = (j.location || "").toLowerCase()
      const isRemote = j.work_mode === "remote" || loc.includes("remote")
      if (!isRemote) {
        const kws = COUNTRY_KW[country] || []
        if (!kws.some(k => loc.includes(k))) return false
      }
    }
    if (workMode !== "all" && j.work_mode !== workMode) return false
    if (jobType !== "all" && j.job_type !== jobType) return false
    if (!matchesDomain(j.title)) return false
    if (!matchesExperience(j.title)) return false
    if (dateFilter !== "all") {
      const days = parseInt(dateFilter)
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      if (new Date(j.posted_at) < cutoff) return false
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
  const activeFilterCount = [workMode !== "all", jobType !== "all", domain !== "All Domains", experience !== "all", dateFilter !== "all", !!salaryMin, !!titleSearch].filter(Boolean).length

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
    jooble:     { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
    monster:    { color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
    himalayas:  { color: "#c084fc", bg: "rgba(192,132,252,0.12)" },
    ashby:      { color: "#34d399", bg: "rgba(52,211,153,0.12)" },
    naukri:     { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
    lensa:      { color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
    ziprecruiter: { color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
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

  const filterStyle = (active: boolean) => ({
    textAlign: "left" as const, padding: "7px 10px", borderRadius: "7px",
    border: active ? "1px solid rgba(124,111,240,0.4)" : "1px solid transparent",
    background: active ? "rgba(124,111,240,0.15)" : "transparent",
    color: active ? "#9b8ff4" : "hsl(220 15% 60%)",
    fontSize: "12px", cursor: "pointer", fontWeight: active ? "600" : "400" as const,
    width: "100%"
  })

  const labelStyle = {
    fontSize: "11px", fontWeight: "600" as const, color: "hsl(220 15% 45%)",
    textTransform: "uppercase" as const, letterSpacing: "0.5px",
    display: "block" as const, marginBottom: "6px"
  }

  const selectStyle = {
    background: "hsl(228 25% 10%)", border: "1px solid hsl(228 20% 18%)",
    borderRadius: "8px", padding: "7px 10px", color: "white",
    fontSize: "12px", outline: "none", cursor: "pointer", width: "100%"
  }

  return (
    <div style={{ minHeight: "100vh", background: "hsl(224 71% 4%)", display: "flex" }}>

      {showFilters && (
        <div style={{ width: "240px", minWidth: "240px", background: "hsl(228 25% 7%)", borderRight: "1px solid hsl(228 20% 13%)", padding: "16px", overflowY: "auto" as const, height: "100vh", position: "sticky" as const, top: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "white" }}>Refine Results</span>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} style={{ background: "rgba(248,113,113,0.15)", color: "#f87171", border: "none", borderRadius: "6px", padding: "3px 8px", fontSize: "11px", cursor: "pointer" }}>
                Clear all
              </button>
            )}
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={labelStyle}>Country / Region</label>
            <select value={country} onChange={e => setCountry(e.target.value)} style={selectStyle}>
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={labelStyle}>Domain</label>
            <select value={domain} onChange={e => setDomain(e.target.value)} style={selectStyle}>
              {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={labelStyle}>Experience</label>
            <select value={experience} onChange={e => setExperience(e.target.value)} style={selectStyle}>
              {EXPERIENCE_LEVELS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={labelStyle}>Work Mode</label>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "3px" }}>
              {[["all","All Modes"],["remote","Remote"],["hybrid","Hybrid"],["onsite","Onsite"]].map(([v,l]) => (
                <button key={v} onClick={() => setWorkMode(v)} style={filterStyle(workMode === v)}>{l}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={labelStyle}>Job Type</label>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "3px" }}>
              {[["all","All Types"],["full_time","Full Time"],["contract","Contract"],["part_time","Part Time"]].map(([v,l]) => (
                <button key={v} onClick={() => setJobType(v)} style={filterStyle(jobType === v)}>{l}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={labelStyle}>Date Posted</label>
            <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={selectStyle}>
              {DATE_FILTERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={labelStyle}>Min Salary (USD)</label>
            <select value={salaryMin} onChange={e => setSalaryMin(e.target.value)} style={selectStyle}>
              <option value="">No minimum</option>
              <option value="50">$50k+</option>
              <option value="80">$80k+</option>
              <option value="100">$100k+</option>
              <option value="120">$120k+</option>
              <option value="150">$150k+</option>
              <option value="200">$200k+</option>
            </select>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={labelStyle}>Sort By</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selectStyle}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="match">AI Match Score</option>
              <option value="salary">Highest Salary</option>
              <option value="company">Company A-Z</option>
            </select>
          </div>

          <div style={{ padding: "12px", background: "hsl(228 25% 10%)", borderRadius: "8px", textAlign: "center" as const }}>
            <div style={{ fontSize: "22px", fontWeight: "700", color: "white" }}>{filteredJobs.length}</div>
            <div style={{ fontSize: "12px", color: "hsl(220 15% 50%)" }}>jobs match filters</div>
            <div style={{ fontSize: "11px", color: "hsl(220 15% 40%)", marginTop: "2px" }}>{allJobs.length} total in database</div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0, padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap" as const, gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button onClick={() => setShowFilters(!showFilters)}
              style={{ background: showFilters ? "rgba(124,111,240,0.15)" : "hsl(228 25% 10%)", border: showFilters ? "1px solid rgba(124,111,240,0.3)" : "1px solid hsl(228 20% 18%)", borderRadius: "8px", padding: "7px 12px", color: showFilters ? "#9b8ff4" : "hsl(220 15% 60%)", fontSize: "12px", cursor: "pointer", fontWeight: "600" as const }}>
              {showFilters ? "Hide Filters" : "Show Filters"}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: "700", color: "white", margin: 0 }}>Browse Jobs</h1>
              <p style={{ color: "hsl(220 15% 50%)", fontSize: "12px", margin: 0 }}>Showing {filteredJobs.length} of {allJobs.length} jobs</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" as const, alignItems: "center" }}>
            <div style={{ display: "flex", background: "hsl(228 25% 10%)", border: "1px solid hsl(228 20% 18%)", borderRadius: "10px", overflow: "hidden", alignItems: "center" }}>
              <input value={fetchQuery} onChange={e => setFetchQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchFreshJobs()}
                placeholder="Search roles..."
                style={{ background: "transparent", border: "none", padding: "9px 12px", color: "white", fontSize: "13px", outline: "none", width: "200px" }} />
              <button onClick={fetchFreshJobs} disabled={fetching}
                style={{ background: fetching ? "hsl(228 20% 18%)" : "linear-gradient(135deg,#7c6ff0,#a78bfa)", color: "white", padding: "9px 16px", fontSize: "13px", fontWeight: "600", border: "none", cursor: fetching ? "not-allowed" : "pointer", opacity: fetching ? 0.7 : 1, whiteSpace: "nowrap" as const, borderLeft: "1px solid hsl(228 20% 18%)" }}>
              {fetching ? "Searching..." : "Search"}
              </button>
            </div>
            <button onClick={scoreJobs} disabled={scoring || allJobs.length === 0}
              style={{ background: "rgba(124,111,240,0.12)", color: "#9b8ff4", padding: "9px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", border: "1px solid rgba(124,111,240,0.25)", cursor: scoring ? "not-allowed" : "pointer", opacity: scoring ? 0.7 : 1 }}>
              {scoring ? "Scoring..." : "AI Match"}
            </button>
            <button onClick={() => loadJobs(userId, "")}
              style={{ background: "transparent", color: "hsl(220 15% 55%)", padding: "9px 14px", borderRadius: "10px", fontSize: "13px", border: "1px solid hsl(228 20% 18%)", cursor: "pointer" }}>
              Refresh
            </button>
          </div>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <input value={titleSearch} onChange={e => setTitleSearch(e.target.value)}
            placeholder="Filter by title or company..."
            style={{ width: "100%", background: "hsl(228 25% 8%)", border: "1px solid hsl(228 20% 15%)", borderRadius: "8px", padding: "9px 14px", color: "white", fontSize: "13px", outline: "none", boxSizing: "border-box" as const }} />
        </div>

        {message && (
          <div style={{ padding: "10px 14px", background: message.startsWith("Error") ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", border: `1px solid ${message.startsWith("Error") ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`, borderRadius: "8px", color: message.startsWith("Error") ? "#f87171" : "#4ade80", fontSize: "13px", marginBottom: "12px" }}>
            {message}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center" as const, padding: "64px", color: "hsl(220 15% 45%)" }}>Loading...</div>
        ) : paginatedJobs.length === 0 ? (
          <div style={{ textAlign: "center" as const, padding: "48px", color: "hsl(220 15% 45%)" }}>
            <p style={{ fontSize: "16px", color: "white", marginBottom: "6px" }}>No jobs found</p>
            <p style={{ fontSize: "13px", marginBottom: "16px" }}>{activeFilterCount > 0 ? "Try clearing some filters" : `Search for "${fetchQuery}" to load jobs`}</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" as const }}>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} style={{ background: "rgba(124,111,240,0.2)", color: "#9b8ff4", padding: "10px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", border: "1px solid rgba(124,111,240,0.3)", cursor: "pointer" }}>
                  Clear Filters
                </button>
              )}
              <button onClick={fetchFreshJobs} disabled={fetching}
                style={{ background: "linear-gradient(135deg,#7c6ff0,#a78bfa)", color: "white", padding: "10px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", border: "none", cursor: "pointer" }}>
                Search Jobs
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px", marginBottom: "20px" }}>
              {paginatedJobs.map(job => {
                const saved = savedIds.has(job.id)
                const isSaving = savingId === job.id
                const sc = srcColor[job.source] || srcColor.other
                const mc = job.ai_match_score
                  ? job.ai_match_score >= 80 ? { bg: "rgba(34,197,94,0.15)", color: "#4ade80" }
                  : job.ai_match_score >= 60 ? { bg: "rgba(251,191,36,0.15)", color: "#fbbf24" }
                  : { bg: "rgba(248,113,113,0.15)", color: "#f87171" } : null
                return (
                  <div key={job.id}
                    style={{ background: "hsl(228 25% 8%)", border: `1px solid ${isFresh(job.posted_at) ? "rgba(74,222,128,0.25)" : "hsl(228 20% 14%)"}`, borderRadius: "12px", padding: "16px", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(124,111,240,0.4)"; e.currentTarget.style.transform = "translateY(-1px)" }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = isFresh(job.posted_at) ? "rgba(74,222,128,0.25)" : "hsl(228 20% 14%)"; e.currentTarget.style.transform = "translateY(0)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                      <div style={{ display: "flex", gap: "5px" }}>
                        {isFresh(job.posted_at) && <span style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", fontSize: "10px", fontWeight: "700", padding: "2px 7px", borderRadius: "20px" }}>NEW</span>}
                        {mc && <span style={{ background: mc.bg, color: mc.color, fontSize: "10px", fontWeight: "700", padding: "2px 7px", borderRadius: "20px" }}>{job.ai_match_score}%</span>}
                      </div>
                      <button onClick={() => toggleSave(job)} disabled={isSaving}
                        style={{ background: saved ? "rgba(124,111,240,0.2)" : "transparent", border: saved ? "1px solid rgba(124,111,240,0.4)" : "1px solid hsl(228 20% 22%)", borderRadius: "6px", padding: "3px 8px", cursor: "pointer", fontSize: "11px", color: saved ? "#9b8ff4" : "hsl(220 15% 50%)", fontWeight: "600" as const }}>
                        {isSaving ? "..." : saved ? "Saved" : "Save"}
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                      {job.company_logo
                        ? <img src={job.company_logo} alt="" style={{ width: "34px", height: "34px", borderRadius: "8px", objectFit: "contain", background: "white", padding: "2px", flexShrink: 0 }} />
                        : <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(124,111,240,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "700", color: "#9b8ff4", flexShrink: 0 }}>{job.company?.[0]?.toUpperCase()}</div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "white", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{job.title}</div>
                        <div style={{ fontSize: "11px", color: "hsl(220 15% 55%)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{job.company} - {job.location}</div>
                      </div>
                    </div>
                    <div style={{ marginBottom: "10px" }}>
                      <span style={badge(job.work_mode, job.work_mode === "remote" ? "#4ade80" : "#9b8ff4", job.work_mode === "remote" ? "rgba(74,222,128,0.12)" : "rgba(124,111,240,0.12)")}>{job.work_mode}</span>
                      <span style={badge(job.job_type?.replace("_", " "), "#9b8ff4", "rgba(124,111,240,0.12)")}>{job.job_type?.replace("_", " ")}</span>
                      <span style={badge(job.source, sc.color, sc.bg)}>{job.source}</span>
                      {job.salary_min && <span style={badge(`$${Math.round(job.salary_min / 1000)}k`, "#fbbf24", "rgba(251,191,36,0.12)")}>${Math.round(job.salary_min / 1000)}k</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                      <span style={{ fontSize: "11px", color: "hsl(220 15% 40%)" }}>{timeAgo(job.posted_at)}</span>
                      <div style={{ display: "flex", gap: "5px" }}>
                        <button onClick={() => sendToResume(job)} style={{ background: "rgba(124,111,240,0.12)", color: "#9b8ff4", padding: "5px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "600", border: "1px solid rgba(124,111,240,0.2)", cursor: "pointer" }}>AI Resume</button>
                        <button onClick={() => oneClickApply(job)} style={{ background: "linear-gradient(135deg,#059669,#10b981)", color: "white", padding: "5px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "600", border: "none", cursor: "pointer" }}>1-Click</button>
                        <button onClick={() => applyAndTrack(job)} style={{ background: "linear-gradient(135deg,#7c6ff0,#a78bfa)", color: "white", padding: "5px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "600", border: "none", cursor: "pointer" }}>Apply</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", flexWrap: "wrap" as const }}>
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} style={pageBtn(false, currentPage === 1)}>First</button>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={pageBtn(false, currentPage === 1)}>Prev</button>
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
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={pageBtn(false, currentPage === totalPages)}>Next</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} style={pageBtn(false, currentPage === totalPages)}>Last</button>
                <span style={{ fontSize: "12px", color: "hsl(220 15% 40%)", marginLeft: "6px" }}>{currentPage}/{totalPages} - {filteredJobs.length} jobs</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
