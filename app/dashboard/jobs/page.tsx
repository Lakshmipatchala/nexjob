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
  const date = new Date(dateStr)
  const now = new Date()
  const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  return diff <= 1
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [search, setSearch] = useState("")
  const [fetchQuery, setFetchQuery] = useState("software engineer")
  const [message, setMessage] = useState("")
  const [lastFetched, setLastFetched] = useState<string>("")

  useEffect(() => { loadJobs() }, [])

  async function loadJobs() {
    setLoading(true)
    const res = await fetch(`/api/jobs/list?search=${search}`)
    const data = await res.json()
    setJobs(data.jobs || [])
    setLoading(false)
    setLastFetched(new Date().toLocaleTimeString())
  }

  async function fetchFreshJobs() {
    setFetching(true)
    setMessage(`Fetching today's "${fetchQuery}" jobs and removing old listings...`)
    const res = await fetch(`/api/jobs/fetch?query=${encodeURIComponent(fetchQuery)}`)
    const data = await res.json()
    if (data.success) {
      setMessage(data.message || `Found ${data.count} fresh jobs`)
      loadJobs()
    } else {
      setMessage(`Error: ${data.error}`)
    }
    setFetching(false)
  }

  const badge = (text: string, color: string, bg: string) => ({
    display:"inline-block" as const, fontSize:"11px", padding:"3px 10px",
    borderRadius:"20px", marginRight:"6px", background:bg, color, fontWeight:"500" as const
  })

  return (
    <div style={{minHeight:"100vh", background:"hsl(224 71% 4%)", padding:"32px"}}>

      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px", flexWrap:"wrap" as const, gap:"12px"}}>
        <div>
          <h1 style={{fontSize:"28px", fontWeight:"700", color:"hsl(213 31% 91%)", margin:"0 0 4px"}}>Browse Jobs</h1>
          <p style={{color:"hsl(215 20% 65%)", fontSize:"13px", margin:"0"}}>
            {jobs.length} jobs from last 7 days
            {lastFetched && <span style={{marginLeft:"10px", color:"hsl(215 20% 45%)"}}>· Updated {lastFetched}</span>}
          </p>
        </div>
        <div style={{display:"flex", gap:"10px", alignItems:"center"}}>
          <input
            value={fetchQuery}
            onChange={e => setFetchQuery(e.target.value)}
            placeholder="e.g. React developer"
            style={{background:"hsl(224 71% 8%)", border:"1px solid hsl(216 34% 17%)", borderRadius:"10px", padding:"10px 14px", color:"hsl(213 31% 91%)", fontSize:"14px", outline:"none", width:"200px"}}
          />
          <button onClick={fetchFreshJobs} disabled={fetching}
            style={{background:"#7c3aed", color:"white", padding:"10px 20px", borderRadius:"10px", fontSize:"14px", fontWeight:"600", border:"none", cursor:"pointer", opacity:fetching?0.7:1, whiteSpace:"nowrap" as const}}>
            {fetching ? "Fetching..." : "Fetch Today's Jobs"}
          </button>
          <button onClick={loadJobs}
            style={{background:"hsl(224 71% 8%)", color:"hsl(213 31% 91%)", padding:"10px 16px", borderRadius:"10px", fontSize:"14px", border:"1px solid hsl(216 34% 17%)", cursor:"pointer"}}>
            Refresh
          </button>
        </div>
      </div>

      {/* Date filter info */}
      <div style={{background:"rgba(124,110,245,0.08)", border:"1px solid rgba(124,110,245,0.2)", borderRadius:"8px", padding:"10px 16px", marginBottom:"20px", fontSize:"13px", color:"hsl(215 20% 65%)", display:"flex", alignItems:"center", gap:"8px"}}>
        <span style={{color:"#a78bfa"}}>📅</span>
        Showing jobs posted in the last <strong style={{color:"#a78bfa", margin:"0 4px"}}>7 days</strong> only.
        Old jobs are automatically removed when you fetch new ones.
      </div>

      {message && (
        <div style={{padding:"12px 16px", background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:"8px", color:"#4ade80", fontSize:"13px", marginBottom:"20px"}}>
          {message}
        </div>
      )}

      <input
        style={{width:"100%", background:"hsl(224 71% 8%)", border:"1px solid hsl(216 34% 17%)", borderRadius:"10px", padding:"12px 16px", color:"hsl(213 31% 91%)", fontSize:"14px", outline:"none", marginBottom:"24px", boxSizing:"border-box" as const}}
        placeholder="Filter jobs by title..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        onKeyDown={e => e.key === "Enter" && loadJobs()}
      />

      {loading ? (
        <div style={{textAlign:"center", padding:"48px", color:"hsl(215 20% 45%)"}}>Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div style={{textAlign:"center", padding:"48px", color:"hsl(215 20% 45%)"}}>
          <p style={{fontSize:"16px", marginBottom:"8px"}}>No recent jobs found</p>
          <p style={{fontSize:"13px", marginBottom:"16px"}}>Click "Fetch Today's Jobs" to load the latest listings</p>
          <button onClick={fetchFreshJobs} disabled={fetching}
            style={{background:"#7c3aed", color:"white", padding:"12px 24px", borderRadius:"10px", fontSize:"14px", fontWeight:"600", border:"none", cursor:"pointer"}}>
            Fetch Today's Jobs
          </button>
        </div>
      ) : (
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:"16px"}}>
          {jobs.map(job => (
            <div key={job.id} style={{background:"hsl(224 71% 6%)", border:`1px solid ${isFresh(job.posted_at) ? "rgba(34,197,94,0.3)" : "hsl(216 34% 17%)"}`, borderRadius:"12px", padding:"20px", position:"relative" as const}}>

              {isFresh(job.posted_at) && (
                <div style={{position:"absolute" as const, top:"12px", right:"12px", background:"rgba(34,197,94,0.15)", color:"#4ade80", fontSize:"10px", fontWeight:"700", padding:"2px 8px", borderRadius:"20px", letterSpacing:"0.5px"}}>
                  NEW TODAY
                </div>
              )}

              <div style={{display:"flex", alignItems:"flex-start", gap:"12px", marginBottom:"12px"}}>
                {job.company_logo && (
                  <img src={job.company_logo} alt={job.company}
                    style={{width:"36px", height:"36px", borderRadius:"8px", objectFit:"contain", background:"white", padding:"2px", flexShrink:0}}/>
                )}
                <div style={{flex:1, paddingRight: isFresh(job.posted_at) ? "60px" : "0"}}>
                  <div style={{fontSize:"15px", fontWeight:"600", color:"hsl(213 31% 91%)", marginBottom:"3px"}}>{job.title}</div>
                  <div style={{fontSize:"13px", color:"hsl(215 20% 65%)"}}>{job.company} · {job.location}</div>
                </div>
              </div>

              <div style={{marginBottom:"10px"}}>
                <span style={badge(job.work_mode, job.work_mode==="remote"?"#4ade80":"#a78bfa", job.work_mode==="remote"?"rgba(74,222,128,0.1)":"rgba(124,110,245,0.15)")}>{job.work_mode}</span>
                <span style={badge(job.job_type, "#a78bfa", "rgba(124,110,245,0.15)")}>{job.job_type}</span>
                <span style={badge(job.source, "#60a5fa", "rgba(96,165,250,0.1)")}>{job.source}</span>
                {job.salary_min && <span style={badge(`$${Math.round(job.salary_min/1000)}k+`, "#fbbf24", "rgba(251,191,36,0.1)")}>${Math.round(job.salary_min/1000)}k+</span>}
              </div>

              <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"14px"}}>
                <span style={{fontSize:"12px", color:"hsl(215 20% 45%)"}}>
                  🕐 {timeAgo(job.posted_at)}
                </span>
                <button onClick={() => window.open(job.source_url, "_blank")}
                  style={{background:"#7c3aed", color:"white", padding:"8px 18px", borderRadius:"8px", fontSize:"13px", fontWeight:"600", border:"none", cursor:"pointer"}}>
                  Apply Now →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}