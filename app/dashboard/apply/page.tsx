"use client"
import { useEffect, useState, Suspense } from "react"
import { createClient } from "@/lib/supabase"
import { useSearchParams, useRouter } from "next/navigation"

function ApplyContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [step, setStep] = useState<"review" | "applying" | "done" | "error">("review")
  const [profile, setProfile] = useState<any>(null)
  const [resumes, setResumes] = useState<any[]>([])
  const [selectedResume, setSelectedResume] = useState("")
  const [coverLetter, setCoverLetter] = useState("")
  const [appData, setAppData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [userId, setUserId] = useState("")
  const [copied, setCopied] = useState<string | null>(null)

  // Get job data from URL params
  const jobId = searchParams.get("jobId") || ""
  const jobTitle = searchParams.get("title") || ""
  const jobCompany = searchParams.get("company") || ""
  const jobUrl = searchParams.get("url") || ""
  const jobSource = searchParams.get("source") || ""
  const jobDescription = searchParams.get("description") || ""

  const jobData = { id: jobId, title: jobTitle, company: jobCompany, source_url: jobUrl, source: jobSource, description: jobDescription }

  useEffect(() => { initUser() }, [])

  async function initUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/login"); return }
    setUserId(user.id)

    const [profRes, resumesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      fetch(`/api/resumes?userId=${user.id}`).then(r => r.json())
    ])
    setProfile(profRes.data)
    setResumes(resumesRes.resumes || [])
    if (resumesRes.resumes?.[0]) setSelectedResume(resumesRes.resumes[0].id)
    setLoading(false)
  }

  async function prepareApplication() {
    setApplying(true)
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          jobId,
          jobData,
          resumeId: selectedResume
        })
      })
      const data = await res.json()
      if (data.error) { setStep("error"); setApplying(false); return }
      setAppData(data.applicationData)
      setCoverLetter(data.coverLetter || "")
      setStep("applying")
    } catch (e: any) { setStep("error") }
    setApplying(false)
  }

  async function copyAndOpen() {
    window.open(jobUrl, "_blank")
    setStep("done")
  }

  async function copyField(value: string, field: string) {
    await navigator.clipboard.writeText(value)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const inp = {
    width: "100%", background: "hsl(228 25% 10%)",
    border: "1px solid hsl(228 20% 18%)", borderRadius: "8px",
    padding: "10px 12px", color: "white", fontSize: "13px",
    outline: "none", boxSizing: "border-box" as const,
    fontFamily: "inherit"
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "hsl(224 71% 4%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
      Loading your profile...
    </div>
  )

  if (!profile?.first_name || !profile?.email) return (
    <div style={{ minHeight: "100vh", background: "hsl(224 71% 4%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px" }}>
      <div style={{ textAlign: "center" as const, maxWidth: "480px" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
        <h2 style={{ color: "white", fontSize: "20px", marginBottom: "12px" }}>Complete your profile first</h2>
        <p style={{ color: "hsl(220 15% 55%)", marginBottom: "24px" }}>Add your name and email to use One-Click Apply</p>
        <button onClick={() => router.push("/dashboard/profile")}
          style={{ background: "linear-gradient(135deg, #7c6ff0, #a78bfa)", color: "white", padding: "12px 24px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", border: "none", cursor: "pointer" }}>
          Complete Profile →
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "hsl(224 71% 4%)", padding: "32px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <button onClick={() => router.back()}
            style={{ background: "transparent", border: "none", color: "hsl(220 15% 55%)", cursor: "pointer", fontSize: "13px", marginBottom: "12px", padding: 0 }}>
            ← Back to Jobs
          </button>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "white", margin: "0 0 4px" }}>
            ⚡ One-Click Apply
          </h1>
          <p style={{ color: "hsl(220 15% 55%)", fontSize: "13px", margin: 0 }}>
            We prepare everything — you review and submit in seconds
          </p>
        </div>

        {/* Job card */}
        <div style={{ background: "hsl(228 25% 8%)", border: "1px solid hsl(228 20% 14%)", borderRadius: "12px", padding: "16px 20px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "rgba(124,111,240,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "700", color: "#9b8ff4", flexShrink: 0 }}>
            {jobCompany?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "white" }}>{jobTitle}</div>
            <div style={{ fontSize: "13px", color: "hsl(220 15% 55%)" }}>{jobCompany} · {jobSource}</div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <span style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80", fontSize: "12px", fontWeight: "600", padding: "4px 12px", borderRadius: "20px" }}>
              Ready to Apply
            </span>
          </div>
        </div>

        {step === "review" && (
          <div>
            {/* Steps indicator */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
              {["Review Info", "Copy & Apply", "Done"].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: i === 0 ? "#7c6ff0" : "hsl(228 20% 14%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: i === 0 ? "white" : "hsl(220 15% 40%)", fontWeight: "600" }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: "13px", color: i === 0 ? "white" : "hsl(220 15% 40%)" }}>{s}</span>
                  {i < 2 && <span style={{ color: "hsl(220 15% 30%)", fontSize: "16px" }}>→</span>}
                </div>
              ))}
            </div>

            {/* Profile info */}
            <div style={{ background: "hsl(228 25% 8%)", border: "1px solid hsl(228 20% 14%)", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "white", marginBottom: "14px" }}>
                👤 Your Information
                <button onClick={() => router.push("/dashboard/profile")}
                  style={{ marginLeft: "12px", background: "transparent", border: "none", color: "#9b8ff4", fontSize: "12px", cursor: "pointer" }}>
                  Edit Profile →
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {[
                  ["Full Name", `${profile.first_name} ${profile.last_name}`],
                  ["Email", profile.email],
                  ["Phone", profile.phone || "Not set"],
                  ["LinkedIn", profile.linkedin_url || "Not set"],
                  ["GitHub", profile.github_url || "Not set"],
                  ["Experience", profile.years_experience ? `${profile.years_experience} years` : "Not set"],
                  ["Work Auth", profile.work_authorization || "Not set"],
                  ["Target Salary", profile.target_salary || "Not set"],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: "hsl(228 25% 11%)", borderRadius: "8px", padding: "10px 12px" }}>
                    <div style={{ fontSize: "11px", color: "hsl(220 15% 45%)", marginBottom: "3px", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>{label}</div>
                    <div style={{ fontSize: "13px", color: value === "Not set" ? "hsl(220 15% 35%)" : "white", fontStyle: value === "Not set" ? "italic" : "normal" }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resume selection */}
            {resumes.length > 0 && (
              <div style={{ background: "hsl(228 25% 8%)", border: "1px solid hsl(228 20% 14%)", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "white", marginBottom: "14px" }}>📄 Select Resume</div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px" }}>
                  {resumes.map(r => (
                    <div key={r.id} onClick={() => setSelectedResume(r.id)}
                      style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", borderRadius: "8px", border: `1px solid ${selectedResume === r.id ? "rgba(124,111,240,0.5)" : "hsl(228 20% 18%)"}`, background: selectedResume === r.id ? "rgba(124,111,240,0.1)" : "transparent", cursor: "pointer" }}>
                      <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: `2px solid ${selectedResume === r.id ? "#9b8ff4" : "hsl(220 15% 35%)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {selectedResume === r.id && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#9b8ff4" }} />}
                      </div>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "white" }}>{r.name}</div>
                        {r.job_title && <div style={{ fontSize: "11px", color: "hsl(220 15% 50%)" }}>Tailored for: {r.job_title}</div>}
                      </div>
                    </div>
                  ))}
                  <div onClick={() => setSelectedResume("")}
                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", borderRadius: "8px", border: `1px solid ${selectedResume === "" ? "rgba(124,111,240,0.5)" : "hsl(228 20% 18%)"}`, background: selectedResume === "" ? "rgba(124,111,240,0.1)" : "transparent", cursor: "pointer" }}>
                    <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: `2px solid ${selectedResume === "" ? "#9b8ff4" : "hsl(220 15% 35%)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {selectedResume === "" && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#9b8ff4" }} />}
                    </div>
                    <div style={{ fontSize: "13px", color: "hsl(220 15% 55%)" }}>Use profile summary only</div>
                  </div>
                </div>
              </div>
            )}

            <button onClick={prepareApplication} disabled={applying}
              style={{ width: "100%", background: "linear-gradient(135deg, #7c6ff0, #a78bfa)", color: "white", padding: "14px", borderRadius: "10px", fontSize: "15px", fontWeight: "600", border: "none", cursor: applying ? "not-allowed" : "pointer", opacity: applying ? 0.7 : 1 }}>
              {applying ? "⏳ AI is preparing your application..." : "⚡ Prepare My Application →"}
            </button>
          </div>
        )}

        {step === "applying" && appData && (
          <div>
            <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "10px", padding: "14px 18px", marginBottom: "20px", color: "#4ade80", fontSize: "14px", fontWeight: "600" }}>
              ✅ Application ready! Copy each field and paste into the job application form.
            </div>

            {/* Quick copy all */}
            <div style={{ background: "hsl(228 25% 8%)", border: "1px solid hsl(228 20% 14%)", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "white", marginBottom: "14px" }}>
                📋 Copy Fields — Paste into Application Form
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                {[
                  ["First Name", appData.first_name],
                  ["Last Name", appData.last_name],
                  ["Email", appData.email],
                  ["Phone", appData.phone],
                  ["LinkedIn URL", appData.linkedin_url],
                  ["GitHub URL", appData.github_url],
                  ["Years of Experience", String(appData.years_experience)],
                  ["Desired Salary", appData.desired_salary],
                  ["Work Authorization", appData.work_authorization],
                  ["Location Preference", appData.desired_location],
                ].filter(([_, v]) => v && v.trim()).map(([label, value]) => (
                  <div key={label} style={{ background: "hsl(228 25% 11%)", borderRadius: "8px", padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <div>
                      <div style={{ fontSize: "10px", color: "hsl(220 15% 45%)", marginBottom: "2px", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>{label}</div>
                      <div style={{ fontSize: "12px", color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, maxWidth: "160px" }}>{value}</div>
                    </div>
                    <button onClick={() => copyField(value, label)}
                      style={{ background: copied === label ? "rgba(34,197,94,0.2)" : "rgba(124,111,240,0.2)", color: copied === label ? "#4ade80" : "#9b8ff4", border: "none", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontWeight: "600", flexShrink: 0 }}>
                      {copied === label ? "✓" : "Copy"}
                    </button>
                  </div>
                ))}
              </div>

              {/* Cover letter */}
              {coverLetter && (
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "white" }}>✉️ AI-Generated Cover Letter</div>
                    <button onClick={() => copyField(coverLetter, "cover_letter")}
                      style={{ background: copied === "cover_letter" ? "rgba(34,197,94,0.2)" : "rgba(124,111,240,0.2)", color: copied === "cover_letter" ? "#4ade80" : "#9b8ff4", border: "none", borderRadius: "6px", padding: "5px 14px", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>
                      {copied === "cover_letter" ? "✓ Copied!" : "Copy Cover Letter"}
                    </button>
                  </div>
                  <textarea
                    value={coverLetter}
                    onChange={e => setCoverLetter(e.target.value)}
                    style={{ ...inp, minHeight: "160px", resize: "vertical" as const, fontSize: "13px", lineHeight: "1.6" }}
                  />
                </div>
              )}

              {/* Resume summary */}
              {appData.resume_summary && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "white" }}>📄 Resume / Summary</div>
                    <button onClick={() => copyField(appData.resume_summary, "resume")}
                      style={{ background: copied === "resume" ? "rgba(34,197,94,0.2)" : "rgba(124,111,240,0.2)", color: copied === "resume" ? "#4ade80" : "#9b8ff4", border: "none", borderRadius: "6px", padding: "5px 14px", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>
                      {copied === "resume" ? "✓ Copied!" : "Copy Resume"}
                    </button>
                  </div>
                  <textarea
                    value={appData.resume_summary}
                    readOnly
                    style={{ ...inp, minHeight: "120px", resize: "vertical" as const, fontSize: "12px", lineHeight: "1.6", opacity: 0.8 }}
                  />
                </div>
              )}
            </div>

            {/* Open application */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={copyAndOpen}
                style={{ flex: 1, background: "linear-gradient(135deg, #7c6ff0, #a78bfa)", color: "white", padding: "14px", borderRadius: "10px", fontSize: "15px", fontWeight: "600", border: "none", cursor: "pointer" }}>
                🚀 Open Application Form →
              </button>
              <button onClick={() => setStep("review")}
                style={{ background: "transparent", color: "hsl(220 15% 55%)", padding: "14px 20px", borderRadius: "10px", fontSize: "14px", border: "1px solid hsl(228 20% 20%)", cursor: "pointer" }}>
                ← Back
              </button>
            </div>

            <p style={{ fontSize: "12px", color: "hsl(220 15% 40%)", textAlign: "center" as const, marginTop: "12px" }}>
              The application form will open in a new tab. Copy each field above and paste it in.
            </p>
          </div>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center" as const, padding: "48px" }}>
            <div style={{ fontSize: "64px", marginBottom: "20px" }}>🎉</div>
            <h2 style={{ fontSize: "24px", fontWeight: "700", color: "white", marginBottom: "8px" }}>Application Submitted!</h2>
            <p style={{ color: "hsl(220 15% 55%)", fontSize: "14px", marginBottom: "28px" }}>
              {jobTitle} at {jobCompany} has been tracked in your Applications
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" as const }}>
              <button onClick={() => router.push("/dashboard/applications")}
                style={{ background: "linear-gradient(135deg, #7c6ff0, #a78bfa)", color: "white", padding: "12px 24px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", border: "none", cursor: "pointer" }}>
                View Applications
              </button>
              <button onClick={() => router.push("/dashboard/jobs")}
                style={{ background: "transparent", color: "hsl(220 15% 65%)", padding: "12px 24px", borderRadius: "10px", fontSize: "14px", border: "1px solid hsl(228 20% 20%)", cursor: "pointer" }}>
                Browse More Jobs
              </button>
            </div>
          </div>
        )}

        {step === "error" && (
          <div style={{ textAlign: "center" as const, padding: "48px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>❌</div>
            <h2 style={{ fontSize: "20px", color: "white", marginBottom: "8px" }}>Something went wrong</h2>
            <p style={{ color: "hsl(220 15% 55%)", marginBottom: "20px" }}>Please try again or apply directly</p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" as const }}>
              <button onClick={() => setStep("review")}
                style={{ background: "#7c6ff0", color: "white", padding: "10px 20px", borderRadius: "8px", fontSize: "14px", border: "none", cursor: "pointer" }}>
                Try Again
              </button>
              <button onClick={() => window.open(jobUrl, "_blank")}
                style={{ background: "transparent", color: "hsl(220 15% 65%)", padding: "10px 20px", borderRadius: "8px", fontSize: "14px", border: "1px solid hsl(228 20% 20%)", cursor: "pointer" }}>
                Apply Directly
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "hsl(224 71% 4%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>Loading...</div>}>
      <ApplyContent />
    </Suspense>
  )
}