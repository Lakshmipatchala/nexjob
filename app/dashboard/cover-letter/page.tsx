"use client"
import { useState } from "react"

export default function CoverLetterPage() {
  const [jobTitle, setJobTitle] = useState("")
  const [company, setCompany] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [resumeText, setResumeText] = useState("")
  const [tone, setTone] = useState("professional")
  const [length, setLength] = useState("medium")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  async function generate() {
    if (!jobTitle || !jobDescription || !resumeText) {
      setError("Please fill in job title, job description, and your background")
      return
    }
    setLoading(true)
    setError("")
    setResult("")
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTitle, company, jobDescription, resumeText, tone, length })
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setResult(data.coverLetter)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  async function copy() {
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function download() {
    const { Document, Paragraph, TextRun, Packer } = await import("docx")
    const { saveAs } = await import("file-saver")
    const paragraphs = result.split("\n\n").map((p: string) =>
      new Paragraph({ children: [new TextRun({ text: p, size: 22, font: "Arial" })], spacing: { after: 200 } })
    )
    const doc = new Document({ sections: [{ children: paragraphs }] })
    const blob = await Packer.toBlob(doc)
    saveAs(blob, `cover_letter_${company || "company"}.docx`)
  }

  const inp = { width: "100%", background: "hsl(224 71% 8%)", border: "1px solid hsl(216 34% 17%)", borderRadius: "10px", padding: "11px 14px", color: "hsl(213 31% 91%)", fontSize: "14px", outline: "none", boxSizing: "border-box" as const, marginBottom: "16px" }
  const lbl = { display: "block" as const, fontSize: "13px", color: "hsl(215 20% 65%)", marginBottom: "6px", fontWeight: "500" as const }
  const card = { background: "hsl(224 71% 6%)", border: "1px solid hsl(216 34% 17%)", borderRadius: "12px", padding: "20px", marginBottom: "16px" }

  return (
    <div style={{ minHeight: "100vh", background: "hsl(224 71% 4%)", padding: "32px" }}>
      <h1 style={{ fontSize: "28px", fontWeight: "700", color: "hsl(213 31% 91%)", marginBottom: "6px" }}>Cover Letter Generator</h1>
      <p style={{ fontSize: "14px", color: "hsl(215 20% 65%)", marginBottom: "28px" }}>AI writes a tailored cover letter from your background and the job</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <div>
          <div style={card}>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "hsl(213 31% 91%)", marginBottom: "14px" }}>Job Details</div>
            <label style={lbl}>Job Title *</label>
            <input style={inp} value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Senior Software Engineer" />
            <label style={lbl}>Company</label>
            <input style={{ ...inp, marginBottom: "0" }} value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Google" />
          </div>
          <div style={card}>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "hsl(213 31% 91%)", marginBottom: "14px" }}>Tone</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" as const, marginBottom: "16px" }}>
              {["professional", "enthusiastic", "concise", "creative"].map(t => (
                <button key={t} onClick={() => setTone(t)}
                  style={{ padding: "8px 16px", borderRadius: "20px", border: tone === t ? "none" : "1px solid hsl(216 34% 25%)", background: tone === t ? "#7c3aed" : "transparent", color: tone === t ? "white" : "hsl(215 20% 65%)", fontSize: "13px", cursor: "pointer" }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "hsl(213 31% 91%)", marginBottom: "10px" }}>Length</div>
            <div style={{ display: "flex", gap: "8px" }}>
              {[["short", "~200 words"], ["medium", "~350 words"], ["long", "~500 words"]].map(([v, l]) => (
                <button key={v} onClick={() => setLength(v)}
                  style={{ flex: 1, padding: "8px", borderRadius: "8px", border: length === v ? "none" : "1px solid hsl(216 34% 25%)", background: length === v ? "#7c3aed" : "transparent", color: length === v ? "white" : "hsl(215 20% 65%)", fontSize: "12px", cursor: "pointer" }}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}<br />
                  <span style={{ fontSize: "11px", opacity: 0.7 }}>{l}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={card}>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "hsl(213 31% 91%)", marginBottom: "14px" }}>Your Background *</div>
            <textarea style={{ ...inp, resize: "vertical" as const, minHeight: "140px", marginBottom: "0" }}
              value={resumeText} onChange={e => setResumeText(e.target.value)}
              placeholder="Paste your resume or a summary of your experience..." />
          </div>
        </div>
        <div>
          <div style={card}>
            <label style={lbl}>Job Description *</label>
            <textarea style={{ ...inp, resize: "vertical" as const, minHeight: "480px", marginBottom: "0" }}
              value={jobDescription} onChange={e => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here..." />
          </div>
        </div>
      </div>
      {error && <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", color: "#f87171", fontSize: "13px", marginBottom: "16px" }}>{error}</div>}
      <button onClick={generate} disabled={loading}
        style={{ width: "100%", background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "white", padding: "14px", borderRadius: "10px", fontSize: "15px", fontWeight: "600", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
        {loading ? "Claude is writing your cover letter..." : "Generate Cover Letter"}
      </button>
      {result && (
        <div style={{ marginTop: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "hsl(213 31% 91%)", margin: 0 }}>Your Cover Letter</h2>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={copy}
                style={{ background: "hsl(224 71% 8%)", color: copied ? "#4ade80" : "hsl(213 31% 91%)", padding: "10px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", border: "1px solid hsl(216 34% 17%)", cursor: "pointer" }}>
                {copied ? "Copied!" : "Copy"}
              </button>
              <button onClick={download}
                style={{ background: "#1d4ed8", color: "white", padding: "10px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", border: "none", cursor: "pointer" }}>
                Download Word
              </button>
            </div>
          </div>
          <div style={{ background: "white", color: "#1a1a1a", padding: "48px", borderRadius: "12px", fontFamily: "Arial, sans-serif", lineHeight: "1.8", maxWidth: "800px", margin: "0 auto", fontSize: "14px", whiteSpace: "pre-wrap" as const }}>
            {result}
          </div>
        </div>
      )}
    </div>
  )
}