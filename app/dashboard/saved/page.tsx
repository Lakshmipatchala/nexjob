"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"

export default function SavedJobsPage() {
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState("")

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setToken(data.session.access_token)
        loadSaved(data.session.access_token)
      }
    })
  }, [])

  async function loadSaved(t: string) {
    setLoading(true)
    const res = await fetch("/api/saved-jobs", { headers: { "Authorization": `Bearer ${t}` } })
    const data = await res.json()
    setSavedIds(data.saved || [])

    if (data.saved?.length > 0) {
      const jobRes = await fetch(`/api/jobs/list?search=`)
      const jobData = await jobRes.json()
      setJobs((jobData.jobs || []).filter((j: any) => data.saved.includes(j.id)))
    }
    setLoading(false)
  }

  async function unsave(jobId: string) {
    await fetch("/api/saved-jobs", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId, action: "unsave" })
    })
    setSavedIds(prev => prev.filter(id => id !== jobId))
    setJobs(prev => prev.filter(j => j.id !== jobId))
  }

  return (
    <div style={{minHeight:"100vh", background:"hsl(224 71% 4%)", padding:"24px 32px"}}>
      <h1 style={{fontSize:"28px", fontWeight:"700", color:"hsl(213 31% 91%)", marginBottom:"6px"}}>Saved Jobs</h1>
      <p style={{fontSize:"14px", color:"hsl(215 20% 65%)", marginBottom:"24px"}}>{savedIds.length} saved jobs</p>

      {loading ? (
        <div style={{textAlign:"center", padding:"48px", color:"hsl(215 20% 45%)"}}>Loading...</div>
      ) : jobs.length === 0 ? (
        <div style={{textAlign:"center", padding:"64px", color:"hsl(215 20% 45%)"}}>
          <div style={{fontSize:"48px", marginBottom:"16px"}}>❤️</div>
          <p style={{fontSize:"16px", marginBottom:"8px"}}>No saved jobs yet</p>
          <p style={{fontSize:"13px", marginBottom:"20px"}}>Click the ❤️ on any job to save it here</p>
          <Link href="/dashboard/jobs" style={{background:"#7c3aed", color:"white", padding:"10px 24px", borderRadius:"10px", fontSize:"14px", fontWeight:"600", textDecoration:"none"}}>
            Browse Jobs
          </Link>
        </div>
      ) : (
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:"16px"}}>
          {jobs.map(job => (
            <div key={job.id} style={{background:"hsl(224 71% 6%)", border:"1px solid hsl(216 34% 17%)", borderRadius:"12px", padding:"20px"}}>
              <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"10px"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:"15px", fontWeight:"600", color:"hsl(213 31% 91%)", marginBottom:"3px"}}>{job.title}</div>
                  <div style={{fontSize:"13px", color:"hsl(215 20% 65%)"}}>{job.company} · {job.location}</div>
                </div>
                <button onClick={()=>unsave(job.id)}
                  style={{background:"none", border:"none", fontSize:"20px", cursor:"pointer", color:"#f87171"}}>❤️</button>
              </div>
              <div style={{display:"flex", gap:"6px", marginBottom:"12px", flexWrap:"wrap" as const}}>
                <span style={{fontSize:"11px", padding:"3px 10px", borderRadius:"20px", background:"rgba(124,110,245,0.15)", color:"#a78bfa"}}>{job.work_mode}</span>
                <span style={{fontSize:"11px", padding:"3px 10px", borderRadius:"20px", background:"rgba(96,165,250,0.1)", color:"#60a5fa"}}>{job.source}</span>
              </div>
              <div style={{display:"flex", gap:"8px"}}>
                <button onClick={()=>window.open(job.source_url,"_blank")}
                  style={{flex:1, background:"#7c3aed", color:"white", padding:"8px", borderRadius:"8px", fontSize:"13px", fontWeight:"600", border:"none", cursor:"pointer"}}>
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