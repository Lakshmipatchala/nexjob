"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

type Status = "applied" | "screening" | "interview" | "offer" | "rejected"
const STATUSES: Status[] = ["applied", "screening", "interview", "offer", "rejected"]
const STATUS_CONFIG: Record<Status, { color: string; bg: string; label: string; emoji: string }> = {
  applied:   { color: "#60a5fa", bg: "rgba(96,165,250,0.1)",   label: "Applied",   emoji: "📤" },
  screening: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)",   label: "Screening", emoji: "🔍" },
  interview: { color: "#a78bfa", bg: "rgba(167,139,250,0.1)",  label: "Interview", emoji: "🎯" },
  offer:     { color: "#4ade80", bg: "rgba(74,222,128,0.1)",   label: "Offer",     emoji: "🎉" },
  rejected:  { color: "#f87171", bg: "rgba(248,113,113,0.1)",  label: "Rejected",  emoji: "❌" },
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Status | "all">("all")
  const [noteEditing, setNoteEditing] = useState<string | null>(null)
  const [noteText, setNoteText] = useState("")

  useEffect(() => { loadApps() }, [])

  async function loadApps() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase.from("applications").select("*").eq("user_id", user.id).order("applied_at", { ascending: false })
    setApps(data || [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: Status) {
    const supabase = createClient()
    await supabase.from("applications").update({ status }).eq("id", id)
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  async function saveNote(id: string) {
    const supabase = createClient()
    await supabase.from("applications").update({ notes: noteText }).eq("id", id)
    setApps(prev => prev.map(a => a.id === id ? { ...a, notes: noteText } : a))
    setNoteEditing(null)
  }

  async function deleteApp(id: string) {
    if (!confirm("Remove this application?")) return
    const supabase = createClient()
    await supabase.from("applications").delete().eq("id", id)
    setApps(prev => prev.filter(a => a.id !== id))
  }

  const filtered = filter === "all" ? apps : apps.filter(a => a.status === filter)
  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: apps.filter(a => a.status === s).length }), {} as Record<Status, number>)

  return (
    <div style={{ minHeight: "100vh", background: "hsl(224 71% 4%)", padding: "32px" }}>
      <h1 style={{ fontSize: "28px", fontWeight: "700", color: "hsl(213 31% 91%)", marginBottom: "6px" }}>Applications Tracker</h1>
      <p style={{ color: "hsl(215 20% 65%)", fontSize: "13px", marginBottom: "24px" }}>{apps.length} total applications tracked</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {STATUSES.map(s => {
          const cfg = STATUS_CONFIG[s]
          return (
            <div key={s} style={{ background: "hsl(224 71% 6%)", border: `1px solid ${cfg.bg}`, borderRadius: "10px", padding: "16px", textAlign: "center" as const }}>
              <div style={{ fontSize: "24px", marginBottom: "4px" }}>{cfg.emoji}</div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: cfg.color }}>{counts[s] || 0}</div>
              <div style={{ fontSize: "12px", color: "hsl(215 20% 55%)" }}>{cfg.label}</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" as const }}>
        {(["all", ...STATUSES] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" as const, cursor: "pointer", border: filter === s ? "none" : "1px solid hsl(216 34% 25%)", background: filter === s ? "#7c3aed" : "transparent", color: filter === s ? "white" : "hsl(215 20% 65%)" }}>
            {s === "all" ? `All (${apps.length})` : `${STATUS_CONFIG[s].emoji} ${STATUS_CONFIG[s].label} (${counts[s] || 0})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: "hsl(215 20% 45%)" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px", color: "hsl(215 20% 45%)" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
          <p style={{ fontSize: "16px", marginBottom: "8px" }}>No applications yet</p>
          <p style={{ fontSize: "13px" }}>Click Apply on any job card to track it here automatically</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: "12px" }}>
          {filtered.map(app => {
            const job = app.job_data || {}
            const cfg = STATUS_CONFIG[app.status as Status] || STATUS_CONFIG.applied
            return (
              <div key={app.id} style={{ background: "hsl(224 71% 6%)", border: "1px solid hsl(216 34% 17%)", borderRadius: "12px", padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" as const }}>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <div style={{ fontSize: "15px", fontWeight: "600", color: "hsl(213 31% 91%)", marginBottom: "3px" }}>{job.title || "Unknown Role"}</div>
                    <div style={{ fontSize: "13px", color: "hsl(215 20% 65%)", marginBottom: "6px" }}>{job.company || "Unknown Company"} · {job.location || ""}</div>
                    <div style={{ fontSize: "11px", color: "hsl(215 20% 45%)" }}>Applied {new Date(app.applied_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
                    {STATUSES.map(s => {
                      const c = STATUS_CONFIG[s]
                      const active = app.status === s
                      return (
                        <button key={s} onClick={() => updateStatus(app.id, s)}
                          style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600" as const, cursor: "pointer", border: active ? "none" : "1px solid hsl(216 34% 25%)", background: active ? c.bg : "transparent", color: active ? c.color : "hsl(215 20% 45%)" }}>
                          {c.emoji} {c.label}
                        </button>
                      )
                    })}
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {job.source_url && (
                      <button onClick={() => window.open(job.source_url, "_blank")}
                        style={{ background: "#7c3aed", color: "white", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "600" as const, border: "none", cursor: "pointer" }}>
                        View Job
                      </button>
                    )}
                    <button onClick={() => deleteApp(app.id)}
                      style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", padding: "6px 10px", borderRadius: "8px", fontSize: "12px", border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer" }}>
                      ✕
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: "12px", borderTop: "1px solid hsl(216 34% 13%)", paddingTop: "12px" }}>
                  {noteEditing === app.id ? (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input value={noteText} onChange={e => setNoteText(e.target.value)}
                        placeholder="Add notes..."
                        style={{ flex: 1, background: "hsl(224 71% 8%)", border: "1px solid hsl(216 34% 17%)", borderRadius: "8px", padding: "8px 12px", color: "hsl(213 31% 91%)", fontSize: "13px", outline: "none" }} />
                      <button onClick={() => saveNote(app.id)} style={{ background: "#7c3aed", color: "white", padding: "8px 14px", borderRadius: "8px", fontSize: "13px", border: "none", cursor: "pointer" }}>Save</button>
                      <button onClick={() => setNoteEditing(null)} style={{ background: "transparent", color: "hsl(215 20% 55%)", padding: "8px 10px", borderRadius: "8px", fontSize: "13px", border: "1px solid hsl(216 34% 25%)", cursor: "pointer" }}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ flex: 1, fontSize: "13px", color: app.notes ? "hsl(215 20% 65%)" : "hsl(215 20% 40%)", fontStyle: app.notes ? "normal" : "italic" }}>
                        {app.notes || "No notes yet..."}
                      </span>
                      <button onClick={() => { setNoteEditing(app.id); setNoteText(app.notes || "") }}
                        style={{ background: "transparent", color: "#a78bfa", border: "none", fontSize: "12px", cursor: "pointer" }}>
                        ✏️ {app.notes ? "Edit" : "Add note"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}