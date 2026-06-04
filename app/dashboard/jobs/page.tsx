"use client"
import { useEffect, useState } from "react"

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

const JOBS_PER_PAGE = 20

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [filtered, setFiltered] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [search, setSearch] = useState("")
  const [fetchQuery, setFetchQuery] = useState("software engineer")
  const [message, setMessage] = useState("")
  const [lastFetched, setLastFetched] = useState("")
  const [page, setPage] = useState(1)
  const [savedJobs, setSavedJobs] = useState<string[]>([])
  const [authToken, setAuthToken] = useState("")

  // Filters
  const [workMode, setWorkMode] = useState("all")
  const [jobType, setJobType] = useState("all")
  const [source, setSource] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [dayFilter, setDayFilter] = useState("7")

  useEffect(() => {
    loadJobs()
    const { createClient } = require("@/lib/supabase")
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }: any) => {
      if (data.session) {
        setAuthToken(data.session.access_token)
        fetch("/api/saved-jobs", { headers: { "Authorization": `Bearer ${data.session.access_token}` } })
          .then(r => r.json()).then(d => setSavedJobs(d.saved || []))
      }
    })
  }, [])

  useEffect(() => {
    applyFilters()
    setPage(1)
  }, [jobs, search, workMode, jobType, source, sortBy, dayFilter])

  async function loadJobs() {
    setLoading(true)
    const res = await fetch(`/api/jobs/list?search=${search}`)
    const data = await res.json()
    setJobs(data.jobs || [])
    setLoading(false)
    setLastFetched(new Date().toLocaleTimeString())
  }

  function applyFilters() {
    let result = [...jobs]

    // Day filter
    if (dayFilter !== "all") {
      const days = parseInt(dayFilter)
      result = result.filter(j => {
        const diff = (new Date().getTime() - new Date(j.posted_at).getTime()) / (1000 * 60 * 60 * 24)
        return diff <= days
      })
    }

    // Search
    if (search) result = result.filter(j => j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase()))

    // Work mode
    if (workMode !== "all") result = result.filter(j => j.work_mode === workMode)

    // Job type
    if (jobType !== "all") result = result.filter(j => j.job_type === jobType)

    // Source
    if (source !== "all") result = result.filter(j => j.source === source)

    // Sort
    if (sortBy === "newest") result.sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime())
    else if (sortBy === "oldest") result.sort((a, b) => new Date(a.posted_at).getTime() - new Date(b.posted_at).getTime())
    else if (sortBy === "company") result.sort((a, b) => a.company.localeCompare(b.company))

    setFiltered(result)
  }

  async function toggleSave(jobId: string) {
    if (!authToken) return
    const action = savedJobs.includes(jobId) ? "unsave" : "save"
    await fetch("/api/saved-jobs", {
      method: "POST",
      headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId, action })
    })
    setSavedJobs(prev => action === "save" ? [...prev, jobId] : prev.filter(id => id !== jobId))
  }

  async function fetchFreshJobs() {
    setFetching(true)
    setMessage(`Fetching "${fetchQuery}" jobs...`)
    const res = await fetch(`/api/jobs/fetch?query=${encodeURIComponent(fetchQuery)}`)
    const data = await res.json()
    if (data.success) {
      setMessage(`Found ${data.count} jobs`)
      loadJobs()
    } else {
      setMessage(`Error: ${data.error}`)
    }
    setFetching(false)
  }

  const totalPages = Math.ceil(filtered.length / JOBS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * JOBS_PER_PAGE, page * JOBS_PER_PAGE)

  const filterBtn = (active: boolean) => ({
    padding:"6px 14px", borderRadius:"20px", fontSize:"12px", fontWeight:"500" as const,
    border: active ? "none" : "1px solid hsl(216 34% 25%)",
    background: active ? "#7c3aed" : "transparent",
    color: active ? "white" : "hsl(215 20% 65%)",
    cursor:"pointer"
  })

  const badge = (text: string, color: string, bg: string) => ({
    display:"inline-block" as const, fontSize:"11px", padding:"3px 10px",
    borderRadius:"20px", marginRight:"6px", background:bg, color, fontWeight:"500" as const
  })

  return (
    <div style={{minHeight:"100vh", background:"hsl(224 71% 4%)", padding:"24px 32px"}}>

      {/* Header */}
      <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"20px", flexWrap:"wrap" as const, gap:"12px"}}>
        <div>
          <h1 style={{fontSize:"28px", fontWeight:"700", color:"hsl(213 31% 91%)", margin:"0 0 4px"}}>Browse Jobs</h1>
          <p style={{color:"hsl(215 20% 65%)", fontSize:"13px", margin:"0"}}>
            {filtered.length} of {jobs.length} jobs
            {lastFetched && <span style={{marginLeft:"10px", color:"hsl(215 20% 45%)"}}>· Updated {lastFetched}</span>}
          </p>
        </div>
        <div style={{display:"flex", gap:"10px", alignItems:"center", flexWrap:"wrap" as const}}>
          <input value={fetchQuery} onChange={e=>setFetchQuery(e.target.value)}
            placeholder="e.g. React developer"
            style={{background:"hsl(224 71% 8%)", border:"1px solid hsl(216 34% 17%)", borderRadius:"10px", padding:"10px 14px", color:"hsl(213 31% 91%)", fontSize:"14px", outline:"none", width:"180px"}}/>
          <button onClick={fetchFreshJobs} disabled={fetching}
            style={{background:"#7c3aed", color:"white", padding:"10px 20px", borderRadius:"10px", fontSize:"14px", fontWeight:"600", border:"none", cursor:"pointer", opacity:fetching?0.7:1}}>
            {fetching ? "Fetching..." : "Fetch Today's Jobs"}
          </button>
          <button onClick={loadJobs}
            style={{background:"hsl(224 71% 8%)", color:"hsl(213 31% 91%)", padding:"10px 16px", borderRadius:"10px", fontSize:"14px", border:"1px solid hsl(216 34% 17%)", cursor:"pointer"}}>
            Refresh
          </button>
        </div>
      </div>

      {message && (
        <div style={{padding:"10px 16px", background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:"8px", color:"#4ade80", fontSize:"13px", marginBottom:"16px"}}>
          {message}
        </div>
      )}

      {/* Filters */}
      <div style={{background:"hsl(224 71% 6%)", border:"1px solid hsl(216 34% 17%)", borderRadius:"12px", padding:"16px 20px", marginBottom:"20px"}}>
        <div style={{display:"grid", gridTemplateColumns:"1fr auto", gap:"12px", marginBottom:"14px"}}>
          <input
            style={{background:"hsl(224 71% 8%)", border:"1px solid hsl(216 34% 17%)", borderRadius:"10px", padding:"10px 14px", color:"hsl(213 31% 91%)", fontSize:"14px", outline:"none"}}
            placeholder="Search by title or company..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
          />
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
            style={{background:"hsl(224 71% 8%)", border:"1px solid hsl(216 34% 17%)", borderRadius:"10px", padding:"10px 14px", color:"hsl(213 31% 91%)", fontSize:"14px", outline:"none", cursor:"pointer"}}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="company">Company A-Z</option>
          </select>
        </div>

        <div style={{display:"flex", gap:"8px", flexWrap:"wrap" as const, marginBottom:"10px"}}>
          <span style={{fontSize:"12px", color:"hsl(215 20% 45%)", alignSelf:"center"}}>Days:</span>
          {["1","2","3","7","all"].map(d => (
            <button key={d} style={filterBtn(dayFilter===d)} onClick={()=>setDayFilter(d)}>
              {d==="all" ? "All time" : d==="1" ? "Today" : `Last ${d} days`}
            </button>
          ))}
        </div>

        <div style={{display:"flex", gap:"8px", flexWrap:"wrap" as const, marginBottom:"10px"}}>
          <span style={{fontSize:"12px", color:"hsl(215 20% 45%)", alignSelf:"center"}}>Mode:</span>
          {["all","remote","hybrid","onsite"].map(m => (
            <button key={m} style={filterBtn(workMode===m)} onClick={()=>setWorkMode(m)}>
              {m==="all" ? "All" : m.charAt(0).toUpperCase()+m.slice(1)}
            </button>
          ))}
        </div>

        <div style={{display:"flex", gap:"8px", flexWrap:"wrap" as const, marginBottom:"10px"}}>
          <span style={{fontSize:"12px", color:"hsl(215 20% 45%)", alignSelf:"center"}}>Type:</span>
          {["all","full_time","contract","internship"].map(t => (
            <button key={t} style={filterBtn(jobType===t)} onClick={()=>setJobType(t)}>
              {t==="all" ? "All" : t==="full_time" ? "Full time" : t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        <div style={{display:"flex", gap:"8px", flexWrap:"wrap" as const}}>
          <span style={{fontSize:"12px", color:"hsl(215 20% 45%)", alignSelf:"center"}}>Source:</span>
          {["all","linkedin","indeed","glassdoor","greenhouse","lever","remotive","other"].map(s => (
            <button key={s} style={filterBtn(source===s)} onClick={()=>setSource(s)}>
              {s==="all" ? "All" : s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Grid */}
      {loading ? (
        <div style={{textAlign:"center", padding:"48px", color:"hsl(215 20% 45%)"}}>Loading jobs...</div>
      ) : filtered.length === 0 ? (
        <div style={{textAlign:"center", padding:"48px", color:"hsl(215 20% 45%)"}}>
          <p style={{fontSize:"16px", marginBottom:"8px"}}>No jobs match your filters</p>
          <button onClick={()=>{setWorkMode("all");setJobType("all");setSource("all");setDayFilter("7");setSearch("")}}
            style={{background:"#7c3aed", color:"white", padding:"10px 20px", borderRadius:"8px", border:"none", cursor:"pointer", fontSize:"14px"}}>
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:"16px", marginBottom:"24px"}}>
            {paginated.map(job => (
              <div key={job.id} style={{background:"hsl(224 71% 6%)", border:`1px solid ${isFresh(job.posted_at)?"rgba(34,197,94,0.3)":"hsl(216 34% 17%)"}`, borderRadius:"12px", padding:"20px", position:"relative" as const}}>
                {isFresh(job.posted_at) && (
                  <div style={{position:"absolute" as const, top:"12px", right:"12px", background:"rgba(34,197,94,0.15)", color:"#4ade80", fontSize:"10px", fontWeight:"700", padding:"2px 8px", borderRadius:"20px"}}>
                    NEW TODAY
                  </div>
                )}
                <div style={{display:"flex", alignItems:"flex-start", gap:"12px", marginBottom:"12px"}}>
                  {job.company_logo && (
                    <img src={job.company_logo} alt={job.company} style={{width:"36px", height:"36px", borderRadius:"8px", objectFit:"contain", background:"white", padding:"2px", flexShrink:0}}/>
                  )}
                  <div style={{flex:1, paddingRight:isFresh(job.posted_at)?"60px":"0"}}>
                    <div style={{fontSize:"15px", fontWeight:"600", color:"hsl(213 31% 91%)", marginBottom:"3px"}}>{job.title}</div>
                    <div style={{fontSize:"13px", color:"hsl(215 20% 65%)"}}>{job.company} · {job.location}</div>
                  </div>
                </div>
                <div style={{marginBottom:"12px"}}>
                  <span style={badge(job.work_mode, job.work_mode==="remote"?"#4ade80":"#a78bfa", job.work_mode==="remote"?"rgba(74,222,128,0.1)":"rgba(124,110,245,0.15)")}>{job.work_mode}</span>
                  <span style={badge(job.job_type,"#a78bfa","rgba(124,110,245,0.15)")}>{job.job_type}</span>
                  <span style={badge(job.source,"#60a5fa","rgba(96,165,250,0.1)")}>{job.source}</span>
                  {job.salary_min && <span style={badge(`$${Math.round(job.salary_min/1000)}k+`,"#fbbf24","rgba(251,191,36,0.1)")}>${Math.round(job.salary_min/1000)}k+</span>}
                </div>
                <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:"6px"}}>
                  <span style={{fontSize:"12px", color:"hsl(215 20% 45%)"}}>🕐 {timeAgo(job.posted_at)}</span>
                  <div style={{display:"flex", gap:"6px"}}>
                    <button onClick={()=>toggleSave(job.id)}
                      style={{background:"transparent", border:"1px solid hsl(216 34% 17%)", padding:"7px 10px", borderRadius:"8px", fontSize:"14px", cursor:"pointer"}}>
                      {savedJobs.includes(job.id) ? "❤️" : "🤍"}
                    </button>
                    <button onClick={()=>window.open(job.source_url,"_blank")}
                      style={{background:"#7c3aed", color:"white", padding:"8px 14px", borderRadius:"8px", fontSize:"13px", fontWeight:"600", border:"none", cursor:"pointer"}}>
                      Apply →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", marginTop:"8px"}}>
              <button onClick={()=>setPage(1)} disabled={page===1}
                style={{padding:"8px 12px", borderRadius:"8px", border:"1px solid hsl(216 34% 17%)", background:"transparent", color:"hsl(215 20% 65%)", cursor:page===1?"not-allowed":"pointer", opacity:page===1?0.4:1}}>
                «
              </button>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                style={{padding:"8px 14px", borderRadius:"8px", border:"1px solid hsl(216 34% 17%)", background:"transparent", color:"hsl(215 20% 65%)", cursor:page===1?"not-allowed":"pointer", opacity:page===1?0.4:1}}>
                ‹ Prev
              </button>

              {Array.from({length:totalPages}, (_,i)=>i+1)
                .filter(p => p===1 || p===totalPages || Math.abs(p-page)<=2)
                .map((p, i, arr) => (
                  <>
                    {i > 0 && arr[i-1] !== p-1 && <span key={`dot-${p}`} style={{color:"hsl(215 20% 45%)"}}>...</span>}
                    <button key={p} onClick={()=>setPage(p)}
                      style={{padding:"8px 14px", borderRadius:"8px", border:"none", background:page===p?"#7c3aed":"transparent", color:page===p?"white":"hsl(215 20% 65%)", cursor:"pointer", fontWeight:page===p?"700":"400"}}>
                      {p}
                    </button>
                  </>
                ))
              }

              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                style={{padding:"8px 14px", borderRadius:"8px", border:"1px solid hsl(216 34% 17%)", background:"transparent", color:"hsl(215 20% 65%)", cursor:page===totalPages?"not-allowed":"pointer", opacity:page===totalPages?0.4:1}}>
                Next ›
              </button>
              <button onClick={()=>setPage(totalPages)} disabled={page===totalPages}
                style={{padding:"8px 12px", borderRadius:"8px", border:"1px solid hsl(216 34% 17%)", background:"transparent", color:"hsl(215 20% 65%)", cursor:page===totalPages?"not-allowed":"pointer", opacity:page===totalPages?0.4:1}}>
                »
              </button>

              <span style={{fontSize:"13px", color:"hsl(215 20% 45%)", marginLeft:"8px"}}>
                Page {page} of {totalPages} · {filtered.length} jobs
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}