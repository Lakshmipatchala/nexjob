"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"

export default function DashboardPage() {
  const [stats, setStats] = useState({ applications: 0, saved: 0, interviews: 0 })
  const [user, setUser] = useState<any>(null)
  const [recentJobs, setRecentJobs] = useState<any[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const token = data.session.access_token

      // Load stats
      const [appRes, savedRes] = await Promise.all([
        fetch("/api/applications", { headers: { "Authorization": `Bearer ${token}` } }),
        fetch("/api/saved-jobs", { headers: { "Authorization": `Bearer ${token}` } }),
      ])
      const [appData, savedData] = await Promise.all([appRes.json(), savedRes.json()])
      const apps = appData.applications || []
      setStats({
        applications: apps.length,
        saved: savedData.saved?.length || 0,
        interviews: apps.filter((a: any) => a.status === "interview").length,
      })
    })

    // Load recent jobs
    fetch("/api/jobs/list?search=").then(r => r.json()).then(d => setRecentJobs((d.jobs || []).slice(0, 6)))
  }, [])

  const card = { background:"hsl(224 71% 6%)", border:"1px solid hsl(216 34% 17%)", borderRadius:"12px", padding:"20px" }
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there"

  return (
    <div style={{minHeight:"100vh", background:"hsl(224 71% 4%)", padding:"24px 32px"}}>
      <div style={{marginBottom:"28px"}}>
        <h1 style={{fontSize:"28px", fontWeight:"700", color:"hsl(213 31% 91%)", marginBottom:"4px"}}>
          Welcome back, {firstName} 👋
        </h1>
        <p style={{fontSize:"14px", color:"hsl(215 20% 65%)"}}>Here's your job search overview</p>
      </div>

      {/* Stats */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:"16px", marginBottom:"28px"}}>
        {[
          { label:"Applications", value:stats.applications, icon:"📋", href:"/dashboard/applications", color:"#60a5fa" },
          { label:"Saved Jobs", value:stats.saved, icon:"❤️", href:"/dashboard/saved", color:"#f87171" },
          { label:"Interviews", value:stats.interviews, icon:"🎯", href:"/dashboard/applications", color:"#4ade80" },
          { label:"Profile", value:"Edit", icon:"👤", href:"/dashboard/profile", color:"#a78bfa" },
        ].map((s, i) => (
          <Link key={i} href={s.href} style={{textDecoration:"none"}}>
            <div style={{...card, cursor:"pointer"}}>
              <div style={{fontSize:"24px", marginBottom:"8px"}}>{s.icon}</div>
              <div style={{fontSize:"28px", fontWeight:"700", color:s.color, marginBottom:"4px"}}>{s.value}</div>
              <div style={{fontSize:"13px", color:"hsl(215 20% 65%)"}}>{s.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"28px"}}>
        <Link href="/dashboard/jobs" style={{textDecoration:"none"}}>
          <div style={{...card, display:"flex", alignItems:"center", gap:"16px", cursor:"pointer"}}>
            <div style={{fontSize:"32px"}}>🔍</div>
            <div>
              <div style={{fontSize:"16px", fontWeight:"600", color:"hsl(213 31% 91%)", marginBottom:"4px"}}>Browse Jobs</div>
              <div style={{fontSize:"13px", color:"hsl(215 20% 65%)"}}>Find your next opportunity</div>
            </div>
          </div>
        </Link>
        <Link href="/dashboard/resume" style={{textDecoration:"none"}}>
          <div style={{...card, display:"flex", alignItems:"center", gap:"16px", cursor:"pointer"}}>
            <div style={{fontSize:"32px"}}>🤖</div>
            <div>
              <div style={{fontSize:"16px", fontWeight:"600", color:"hsl(213 31% 91%)", marginBottom:"4px"}}>AI Resume Builder</div>
              <div style={{fontSize:"13px", color:"hsl(215 20% 65%)"}}>Tailor your resume with Claude AI</div>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent jobs */}
      {recentJobs.length > 0 && (
        <div>
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px"}}>
            <h2 style={{fontSize:"18px", fontWeight:"600", color:"hsl(213 31% 91%)", margin:"0"}}>Latest Jobs</h2>
            <Link href="/dashboard/jobs" style={{fontSize:"13px", color:"#a78bfa", textDecoration:"none"}}>View all →</Link>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:"12px"}}>
            {recentJobs.map(job => (
              <div key={job.id} style={card}>
                <div style={{fontSize:"14px", fontWeight:"600", color:"hsl(213 31% 91%)", marginBottom:"4px"}}>{job.title}</div>
                <div style={{fontSize:"12px", color:"hsl(215 20% 65%)", marginBottom:"10px"}}>{job.company} · {job.location}</div>
                <button onClick={()=>window.open(job.source_url,"_blank")}
                  style={{width:"100%", background:"#7c3aed", color:"white", padding:"7px", borderRadius:"8px", fontSize:"12px", fontWeight:"600", border:"none", cursor:"pointer"}}>
                  Apply Now →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}