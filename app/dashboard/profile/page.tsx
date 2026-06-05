"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pwMsg, setPwMsg] = useState("")

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    setProfile(data || { id: user.id, email: user.email, phone: user.phone })
    setLoading(false)
  }

  async function saveProfile() {
    setSaving(true)
    setError("")
    const supabase = createClient()
    const { error } = await supabase.from("profiles").upsert(profile)
    if (error) setError(error.message)
    else { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    setSaving(false)
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) { setPwMsg("Passwords do not match"); return }
    if (newPassword.length < 6) { setPwMsg("Password must be at least 6 characters"); return }
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) setPwMsg(error.message)
    else { setPwMsg("Password updated!"); setNewPassword(""); setConfirmPassword(""); setChangingPassword(false) }
  }

  const inp = { width: "100%", background: "hsl(224 71% 8%)", border: "1px solid hsl(216 34% 17%)", borderRadius: "10px", padding: "11px 14px", color: "hsl(213 31% 91%)", fontSize: "14px", outline: "none", boxSizing: "border-box" as const, marginBottom: "16px" }
  const lbl = { display: "block" as const, fontSize: "13px", color: "hsl(215 20% 65%)", marginBottom: "6px", fontWeight: "500" as const }
  const card = { background: "hsl(224 71% 6%)", border: "1px solid hsl(216 34% 17%)", borderRadius: "12px", padding: "24px", marginBottom: "16px" }
  const set = (k: string, v: any) => setProfile((p: any) => ({ ...p, [k]: v }))

  if (loading) return <div style={{ minHeight: "100vh", background: "hsl(224 71% 4%)", display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(215 20% 45%)" }}>Loading...</div>

  return (
    <div style={{ minHeight: "100vh", background: "hsl(224 71% 4%)", padding: "32px", maxWidth: "800px" }}>
      <h1 style={{ fontSize: "28px", fontWeight: "700", color: "hsl(213 31% 91%)", marginBottom: "6px" }}>Profile & Settings</h1>
      <p style={{ color: "hsl(215 20% 65%)", fontSize: "13px", marginBottom: "28px" }}>Your info is used to autofill applications and tailor your resume</p>
      <div style={card}>
        <div style={{ fontSize: "15px", fontWeight: "600", color: "hsl(213 31% 91%)", marginBottom: "18px" }}>Personal Information</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div><label style={lbl}>First Name</label><input style={inp} value={profile.first_name || ""} onChange={e => set("first_name", e.target.value)} placeholder="Alex" /></div>
          <div><label style={lbl}>Last Name</label><input style={inp} value={profile.last_name || ""} onChange={e => set("last_name", e.target.value)} placeholder="Kim" /></div>
        </div>
        <label style={lbl}>Email</label>
        <input style={{ ...inp, opacity: 0.6 }} value={profile.email || ""} disabled />
        <label style={lbl}>Phone</label>
        <input style={inp} value={profile.phone || ""} onChange={e => set("phone", e.target.value)} placeholder="+1 (555) 000-0000" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div><label style={lbl}>LinkedIn URL</label><input style={inp} value={profile.linkedin_url || ""} onChange={e => set("linkedin_url", e.target.value)} placeholder="linkedin.com/in/username" /></div>
          <div><label style={lbl}>GitHub URL</label><input style={inp} value={profile.github_url || ""} onChange={e => set("github_url", e.target.value)} placeholder="github.com/username" /></div>
        </div>
      </div>
      <div style={card}>
        <div style={{ fontSize: "15px", fontWeight: "600", color: "hsl(213 31% 91%)", marginBottom: "18px" }}>Professional Details</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <label style={lbl}>Years of Experience</label>
            <input type="number" style={inp} value={profile.years_experience || ""} onChange={e => set("years_experience", Number(e.target.value))} placeholder="5" />
          </div>
          <div>
            <label style={lbl}>Work Authorization</label>
            <select style={{ ...inp, cursor: "pointer" }} value={profile.work_authorization || ""} onChange={e => set("work_authorization", e.target.value)}>
              <option value="">Select...</option>
              <option value="us_citizen">US Citizen</option>
              <option value="green_card">Green Card / PR</option>
              <option value="h1b">H-1B Visa</option>
              <option value="opt">OPT / CPT</option>
              <option value="tn">TN Visa</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <label style={lbl}>Desired Job Title</label>
        <input style={inp} value={profile.desired_title || ""} onChange={e => set("desired_title", e.target.value)} placeholder="e.g. Senior Data Engineer" />
        <label style={lbl}>Desired Location</label>
        <input style={inp} value={profile.desired_location || ""} onChange={e => set("desired_location", e.target.value)} placeholder="e.g. New York, NY or Remote" />
        <label style={lbl}>Target Salary</label>
        <input style={inp} value={profile.target_salary || ""} onChange={e => set("target_salary", e.target.value)} placeholder="e.g. $150,000" />
        <label style={lbl}>Resume Summary</label>
        <textarea style={{ ...inp, resize: "vertical" as const, minHeight: "100px", marginBottom: "0" }}
          value={profile.resume_summary || ""} onChange={e => set("resume_summary", e.target.value)}
          placeholder="Experienced data engineer with 7 years building pipelines..." />
      </div>
      {error && <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", color: "#f87171", fontSize: "13px", marginBottom: "16px" }}>{error}</div>}
      <button onClick={saveProfile} disabled={saving}
        style={{ width: "100%", background: saved ? "#059669" : "linear-gradient(135deg, #7c3aed, #a855f7)", color: "white", padding: "14px", borderRadius: "10px", fontSize: "15px", fontWeight: "600", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, marginBottom: "24px" }}>
        {saving ? "Saving..." : saved ? "Saved!" : "Save Profile"}
      </button>
      <div style={card}>
        <div style={{ fontSize: "15px", fontWeight: "600", color: "hsl(213 31% 91%)", marginBottom: "14px" }}>Security</div>
        {!changingPassword ? (
          <button onClick={() => setChangingPassword(true)}
            style={{ background: "hsl(224 71% 8%)", color: "hsl(213 31% 91%)", padding: "10px 20px", borderRadius: "8px", fontSize: "14px", border: "1px solid hsl(216 34% 17%)", cursor: "pointer" }}>
            Change Password
          </button>
        ) : (
          <div>
            <label style={lbl}>New Password</label>
            <input type="password" style={inp} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
            <label style={lbl}>Confirm Password</label>
            <input type="password" style={{ ...inp, marginBottom: "12px" }} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password" />
            {pwMsg && <div style={{ fontSize: "13px", color: pwMsg.includes("updated") ? "#4ade80" : "#f87171", marginBottom: "12px" }}>{pwMsg}</div>}
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={changePassword} style={{ background: "#7c3aed", color: "white", padding: "10px 20px", borderRadius: "8px", fontSize: "14px", border: "none", cursor: "pointer" }}>Update Password</button>
              <button onClick={() => setChangingPassword(false)} style={{ background: "transparent", color: "hsl(215 20% 55%)", padding: "10px 16px", borderRadius: "8px", fontSize: "14px", border: "1px solid hsl(216 34% 25%)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}