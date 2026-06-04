"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

const STATUSES = [
  { key:"applied", label:"Applied", color:"#60a5fa", bg:"rgba(96,165,250,0.1)" },
  { key:"screening", label:"Screening", color:"#fbbf24", bg:"rgba(251,191,36,0.1)" },
  { key:"interview", label:"Interview", color:"#a78bfa", bg:"rgba(167,139,250,0.1)" },
  { key:"offer", label:"Offer", color:"#4ade80", bg:"rgba(74,222,128,0.1)" },
  { key:"rejected", label:"Rejected", color:"#f87171", bg:"rgba(248,113,113,0.1)" },
  { key:"withdrawn", label:"Withdrawn", color:"hsl(215 20% 45%)", bg:"rgba(255,255,255,0.05)" },
]

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [token, setToken] = useState("")

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setToken(data.session.access_token)
        loadApplications(data.session.access_token)
      }
    })
  }, [])

  async function loadApplications(t: string) {
    setLoading(true)
    const res = await fetch("/api/applications", {
      headers: { "Authorization": `Bearer ${t}` }
    })
    const data = await res.json()
    setApplications(data.applications || [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id, status })
    })
    loadApplications(token)
  }

  const filtered = filter === "all" ? applications : applications.filter(a => a.status === filter)
  const stats = STATUSES.map(s => ({ ...s, count: applications.filter(a => a.status === s.key).length }))
  const card = { background:"hsl(224 71% 6%)", border:"1px solid hsl(216 34% 17%)", borderRadius:"12px", padding:"20px", marginBottom:"12px" }

  return (
    <div style={{minHeight:"100vh", background:"hsl(224 71% 4%)", padding:"24px 32px"}}>
      <h1 style={{fontSize:"28px", fontWeight:"700", color:"hsl(213 31% 91%)", marginBottom:"6px"}}>Application Tracker</h1>
      <p style={{fontSize:"14px", color:"hsl(215 20% 65%)", marginBottom:"24px"}}>{applications.length} total applications</p>

      {/* Stats */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(6, 1fr)", gap:"12px", marginBottom:"24px"}}>
        {stats.map(s => (
          <div key={s.key} style={{background:"hsl(224 71% 6%)", border:`1px solid ${s.count>0?s.color:"hsl(216 34% 17%)"}`, borderRadius:"10px", padding:"14px", textAlign:"center" as const, cursor:"pointer"}}
            onClick={()=>setFilter(s.key)}>
            <div style={{fontSize:"24px", fontWeight:"700", color:s.color}}>{s.count}</div>
            <div style={{fontSize:"12px", color:"hsl(215 20% 65%)", marginTop:"4px"}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{display:"flex", gap:"8px", marginBottom:"20px", flexWrap:"wrap" as const}}>
        {["all", ...STATUSES.map(s=>s.key)].map(f => (
          <button key={f} onClick={()=>setFilter(f)}
            style={{padding:"6px 16px", borderRadius:"20px", fontSize:"13px", fontWeight:"500", border:"none", cursor:"pointer",
              background:filter===f?"#7c3aed":"hsl(224 71% 8%)",
              color:filter===f?"white":"hsl(215 20% 65%)"}}>
            {f==="all"?"All":STATUSES.find(s=>s.key===f)?.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{textAlign:"center", padding:"48px", color:"hsl(215 20% 45%)"}}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{textAlign:"center", padding:"48px", color:"hsl(215 20% 45%)"}}>
          <div style={{fontSize:"48px", marginBottom:"16px"}}>📋</div>
          <p style={{fontSize:"16px", marginBottom:"8px"}}>No applications yet</p>
          <p style={{fontSize:"13px"}}>Click "Track Application" on any job to add it here</p>
        </div>
      ) : (
        filtered.map(app => {
          const status = STATUSES.find(s => s.key === app.status) || STATUSES[0]
          return (
            <div key={app.id} style={card}>
              <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"12px", flexWrap:"wrap" as const}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:"16px", fontWeight:"600", color:"hsl(213 31% 91%)", marginBottom:"4px"}}>
                    {app.jobs?.title || "Unknown Job"}
                  </div>
                  <div style={{fontSize:"13px", color:"hsl(215 20% 65%)", marginBottom:"8px"}}>
                    {app.jobs?.company} · {app.jobs?.location}
                  </div>
                  <div style={{fontSize:"12px", color:"hsl(215 20% 45%)"}}>
                    Applied {new Date(app.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{display:"flex", alignItems:"center", gap:"10px"}}>
                  <span style={{padding:"4px 12px", borderRadius:"20px", fontSize:"12px", fontWeight:"600", background:status.bg, color:status.color}}>
                    {status.label}
                  </span>
                  <select
                    value={app.status}
                    onChange={e=>updateStatus(app.id, e.target.value)}
                    style={{background:"hsl(224 71% 8%)", border:"1px solid hsl(216 34% 17%)", borderRadius:"8px", padding:"6px 10px", color:"hsl(213 31% 91%)", fontSize:"13px", cursor:"pointer", outline:"none"}}>
                    {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                  <button onClick={()=>window.open(app.jobs?.source_url,"_blank")}
                    style={{background:"#7c3aed", color:"white", padding:"6px 14px", borderRadius:"8px", fontSize:"13px", fontWeight:"600", border:"none", cursor:"pointer"}}>
                    View Job
                  </button>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}