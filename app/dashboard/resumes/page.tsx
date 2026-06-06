"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function ResumesPage() {
  const [resumes, setResumes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState("")
  const [message, setMessage] = useState("")
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameText, setRenameText] = useState("")
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const router = useRouter()
  const MAX_RESUMES = 3

  useEffect(() => { initUser() }, [])

  async function initUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) { setUserId(user.id); loadResumes(user.id) }
    else setLoading(false)
  }

  async function loadResumes(uid: string) {
    setLoading(true)
    const res = await fetch(`/api/resumes?userId=${uid}`)
    const data = await res.json()
    setResumes(data.resumes || [])
    setLoading(false)
  }

  async function deleteResume(id: string) {
    if (!confirm("Delete this resume?")) return
    const res = await fetch("/api/resumes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    })
    const data = await res.json()
    if (data.success) { setResumes(prev => prev.filter(r => r.id !== id)); showMsg("Deleted!") }
    setMenuOpen(null)
  }

  async function saveRename(id: string) {
    if (!renameText.trim()) return
    const res = await fetch("/api/resumes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: renameText })
    })
    const data = await res.json()
    if (data.success) { setResumes(prev => prev.map(r => r.id === id ? { ...r, name: renameText } : r)); showMsg("Renamed!") }
    setRenamingId(null); setMenuOpen(null)
  }

  async function downloadResume(resume: any) {
    try {
      const { Document, Paragraph, TextRun, Packer } = await import("docx")
      const { saveAs } = await import("file-saver")
      const paragraphs = resume.content.split("\n").map((line: string) =>
        new Paragraph({ children: [new TextRun({ text: line, size: 22, font: "Arial" })], spacing: { after: 100 } })
      )
      const doc = new Document({ sections: [{ children: paragraphs }] })
      const blob = await Packer.toBlob(doc)
      saveAs(blob, `${resume.name.replace(/\s+/g, "_")}.docx`)
    } catch (e: any) { showMsg(`Error: ${e.message}`) }
    setMenuOpen(null)
  }

  async function copyResume(content: string) {
    await navigator.clipboard.writeText(content)
    showMsg("Copied!"); setMenuOpen(null)
  }

  function showMsg(msg: string) { setMessage(msg); setTimeout(() => setMessage(""), 3000) }

  function timeAgo(dateStr: string): string {
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return "today"
    if (diff === 1) return "yesterday"
    if (diff < 30) return `${diff} days ago`
    if (diff < 60) return "a month ago"
    return `${Math.floor(diff / 30)} months ago`
  }

  function getInitials(name: string): string {
    return name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "R"
  }

  return (
    <div style={{ minHeight: "100vh", background: "hsl(224 71% 4%)", padding: "40px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: "800", color: "hsl(213 31% 91%)", margin: "0 0 8px", letterSpacing: "-0.5px" }}>RESUME</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "hsl(215 20% 55%)" }}>
            <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>😊</div>
            You have <strong style={{ color: "hsl(213 31% 91%)" }}>{resumes.length}</strong> resume{resumes.length !== 1 ? "s" : ""} saved out of <strong style={{ color: "hsl(213 31% 91%)" }}>{MAX_RESUMES}</strong> available slots.
          </div>
        </div>
        <button onClick={() => resumes.length >= MAX_RESUMES ? showMsg("Maximum 3 resumes. Delete one first.") : router.push("/dashboard/resume")}
          style={{ background: resumes.length >= MAX_RESUMES ? "hsl(224 71% 8%)" : "linear-gradient(135deg, #7c3aed, #a855f7)", color: resumes.length >= MAX_RESUMES ? "hsl(215 20% 45%)" : "white", padding: "10px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", border: resumes.length >= MAX_RESUMES ? "1px solid hsl(216 34% 17%)" : "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "18px" }}>+</span> Add Resume
        </button>
      </div>

      {message && (
        <div style={{ padding: "10px 16px", background: message.includes("Error") ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", border: `1px solid ${message.includes("Error") ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`, borderRadius: "8px", color: message.includes("Error") ? "#f87171" : "#4ade80", fontSize: "13px", marginBottom: "20px" }}>
          {message}
        </div>
      )}

      <div style={{ background: "hsl(224 71% 6%)", border: "1px solid hsl(216 34% 17%)", borderRadius: "14px", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 40px", padding: "14px 24px", borderBottom: "1px solid hsl(216 34% 17%)", background: "hsl(224 71% 5%)" }}>
          {["Resume", "Target Job Title", "Last Modified", "Created", ""].map((h, i) => (
            <div key={i} style={{ fontSize: "12px", fontWeight: "600", color: "hsl(215 20% 45%)", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: "48px", textAlign: "center" as const, color: "hsl(215 20% 45%)" }}>Loading...</div>
        ) : resumes.length === 0 ? (
          <div style={{ padding: "64px", textAlign: "center" as const }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📄</div>
            <div style={{ fontSize: "16px", color: "hsl(213 31% 91%)", marginBottom: "8px" }}>No resumes yet</div>
            <div style={{ fontSize: "13px", color: "hsl(215 20% 55%)", marginBottom: "20px" }}>Build your first AI-powered resume</div>
            <button onClick={() => router.push("/dashboard/resume")}
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "white", padding: "12px 24px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", border: "none", cursor: "pointer" }}>
              Build Resume
            </button>
          </div>
        ) : (
          resumes.map((resume, index) => (
            <div key={resume.id}
              style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 40px", padding: "16px 24px", borderBottom: index < resumes.length - 1 ? "1px solid hsl(216 34% 13%)" : "none", alignItems: "center" }}
              onMouseEnter={e => (e.currentTarget.style.background = "hsl(224 71% 7%)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: index === 0 ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "hsl(224 71% 12%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700", color: "white", flexShrink: 0 }}>
                  {getInitials(resume.name)}
                </div>
                <div>
                  {renamingId === resume.id ? (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input value={renameText} onChange={e => setRenameText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveRename(resume.id); if (e.key === "Escape") setRenamingId(null) }}
                        autoFocus
                        style={{ background: "hsl(224 71% 8%)", border: "1px solid #7c3aed", borderRadius: "6px", padding: "4px 8px", color: "hsl(213 31% 91%)", fontSize: "14px", outline: "none", width: "180px" }} />
                      <button onClick={() => saveRename(resume.id)} style={{ background: "#7c3aed", color: "white", border: "none", borderRadius: "6px", padding: "4px 10px", fontSize: "12px", cursor: "pointer" }}>Save</button>
                      <button onClick={() => setRenamingId(null)} style={{ background: "transparent", color: "hsl(215 20% 55%)", border: "1px solid hsl(216 34% 25%)", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", cursor: "pointer" }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "14px", fontWeight: "600", color: "hsl(213 31% 91%)" }}>{resume.name}</span>
                      {index === 0 && <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "20px", background: "rgba(124,58,237,0.2)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.3)" }}>★ PRIMARY</span>}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ fontSize: "13px", color: "hsl(215 20% 55%)" }}>{resume.job_title || <span style={{ color: "hsl(215 20% 35%)" }}>—</span>}{resume.company && ` · ${resume.company}`}</div>
              <div style={{ fontSize: "13px", color: "hsl(215 20% 55%)" }}>{timeAgo(resume.updated_at)}</div>
              <div style={{ fontSize: "13px", color: "hsl(215 20% 55%)" }}>{timeAgo(resume.created_at)}</div>
              <div style={{ position: "relative" as const }}>
                <button onClick={() => setMenuOpen(menuOpen === resume.id ? null : resume.id)}
                  style={{ background: "transparent", border: "none", color: "hsl(215 20% 55%)", cursor: "pointer", fontSize: "18px", padding: "4px 8px", borderRadius: "6px" }}>
                  ···
                </button>
                {menuOpen === resume.id && (
                  <div style={{ position: "absolute" as const, right: 0, top: "30px", background: "hsl(224 71% 8%)", border: "1px solid hsl(216 34% 17%)", borderRadius: "10px", padding: "6px", minWidth: "160px", zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                    {[
                      { label: "✏️ Rename", action: () => { setRenamingId(resume.id); setRenameText(resume.name); setMenuOpen(null) } },
                      { label: "📋 Copy text", action: () => copyResume(resume.content) },
                      { label: "📥 Download Word", action: () => downloadResume(resume) },
                      { label: "🗑️ Delete", action: () => deleteResume(resume.id), danger: true },
                    ].map((item: any, i) => (
                      <button key={i} onClick={item.action}
                        style={{ display: "block", width: "100%", textAlign: "left" as const, padding: "8px 12px", fontSize: "13px", color: item.danger ? "#f87171" : "hsl(213 31% 91%)", background: "transparent", border: "none", cursor: "pointer", borderRadius: "6px" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "hsl(224 71% 12%)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {!loading && resumes.length < MAX_RESUMES && (
          <div style={{ padding: "16px 24px", borderTop: resumes.length > 0 ? "1px solid hsl(216 34% 13%)" : "none", display: "flex", gap: "12px" }}>
            {Array.from({ length: MAX_RESUMES - resumes.length }).map((_, i) => (
              <button key={i} onClick={() => router.push("/dashboard/resume")}
                style={{ flex: 1, padding: "16px", borderRadius: "10px", border: "2px dashed hsl(216 34% 20%)", background: "transparent", color: "hsl(215 20% 45%)", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <span style={{ fontSize: "20px", color: "#7c3aed" }}>+</span> Add Resume {resumes.length + i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: "20px", background: "hsl(224 71% 6%)", border: "1px solid hsl(216 34% 17%)", borderRadius: "12px", padding: "16px 20px" }}>
        <div style={{ fontSize: "13px", fontWeight: "600", color: "hsl(213 31% 91%)", marginBottom: "8px" }}>💡 Tips</div>
        <div style={{ fontSize: "12px", color: "hsl(215 20% 55%)", lineHeight: "1.8" }}>
          • Save up to <strong style={{ color: "hsl(213 31% 91%)" }}>3 different resumes</strong> — one for each role type you are targeting<br/>
          • The <strong style={{ color: "#a78bfa" }}>★ PRIMARY</strong> resume is your main resume shown first<br/>
          • Use <strong style={{ color: "hsl(213 31% 91%)" }}>AI Resume Builder</strong> to create a tailored resume for any job<br/>
          • Click <strong style={{ color: "hsl(213 31% 91%)" }}>···</strong> to rename, copy, download or delete
        </div>
      </div>
    </div>
  )
}