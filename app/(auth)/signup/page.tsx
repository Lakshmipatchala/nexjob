"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"
import { useRouter } from "next/navigation"

type AuthMode = "email" | "phone"

export default function SignupPage() {
  const [mode, setMode] = useState<AuthMode>("email")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.user) {
      const parts = name.split(" ")
      await supabase.from("profiles").insert({
        id: data.user.id,
        email,
        first_name: parts[0] || "",
        last_name: parts.slice(1).join(" ") || "",
        autofill_engine: "backend"
      })
      router.push("/dashboard")
    }
    setLoading(false)
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    // Format phone: ensure +1 or international prefix
    const formatted = phone.startsWith("+") ? phone : `+1${phone.replace(/\D/g, "")}`
    const { error } = await supabase.auth.signInWithOtp({ phone: formatted })
    if (error) { setError(error.message); setLoading(false); return }
    setOtpSent(true)
    setLoading(false)
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const formatted = phone.startsWith("+") ? phone : `+1${phone.replace(/\D/g, "")}`
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formatted,
      token: otp,
      type: "sms"
    })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.user) {
      const parts = name.split(" ")
      await supabase.from("profiles").upsert({
        id: data.user.id,
        phone: formatted,
        first_name: parts[0] || "",
        last_name: parts.slice(1).join(" ") || "",
        autofill_engine: "backend"
      })
      router.push("/dashboard")
    }
    setLoading(false)
  }

  const inputStyle = { width: "100%", background: "hsl(224 71% 8%)", border: "1px solid hsl(216 34% 17%)", borderRadius: "10px", padding: "11px 14px", color: "hsl(213 31% 91%)", fontSize: "14px", outline: "none", boxSizing: "border-box" as const }
  const labelStyle = { display: "block" as const, fontSize: "13px", color: "hsl(215 20% 65%)", marginBottom: "6px", fontWeight: "500" as const }
  const tabActive = { flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: "#7c3aed", color: "white", fontSize: "14px", fontWeight: "600" as const, cursor: "pointer" }
  const tabInactive = { flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid hsl(216 34% 17%)", background: "transparent", color: "hsl(215 20% 65%)", fontSize: "14px", cursor: "pointer" }

  return (
    <div style={{ width: "100%", maxWidth: "420px", background: "hsl(224 71% 6%)", border: "1px solid hsl(216 34% 17%)", borderRadius: "16px", padding: "40px" }}>
      <div style={{ marginBottom: "28px", textAlign: "center" as const }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700", background: "linear-gradient(135deg, #8b5cf6, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "8px" }}>NexJob</h1>
        <p style={{ color: "hsl(215 20% 65%)", fontSize: "15px" }}>Create your account</p>
      </div>

      {/* Auth mode tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", background: "hsl(224 71% 4%)", borderRadius: "10px", padding: "4px" }}>
        <button style={mode === "email" ? tabActive : tabInactive} onClick={() => setMode("email")}>📧 Email</button>
        <button style={mode === "phone" ? tabActive : tabInactive} onClick={() => setMode("phone")}>📱 Phone SMS</button>
      </div>

      {mode === "email" ? (
        <form onSubmit={handleEmailSignup}>
          <div style={{ marginBottom: "16px" }}><label style={labelStyle}>Full name</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Alex Kim" required style={inputStyle} /></div>
          <div style={{ marginBottom: "16px" }}><label style={labelStyle}>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required style={inputStyle} /></div>
          <div style={{ marginBottom: "24px" }}><label style={labelStyle}>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} style={inputStyle} /></div>
          {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#f87171", marginBottom: "16px" }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: "100%", background: "#7c3aed", color: "white", padding: "12px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", border: "none", cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
      ) : (
        <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
          <div style={{ marginBottom: "16px" }}><label style={labelStyle}>Full name</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Alex Kim" required style={inputStyle} /></div>
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Phone number</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" required disabled={otpSent} style={{ ...inputStyle, opacity: otpSent ? 0.6 : 1 }} />
            <div style={{ fontSize: "12px", color: "hsl(215 20% 45%)", marginTop: "4px" }}>US numbers: enter 10 digits. International: include + and country code.</div>
          </div>
          {otpSent && (
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Enter the 6-digit code sent to your phone</label>
              <input type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456" maxLength={6} required style={inputStyle} />
              <button type="button" onClick={() => setOtpSent(false)} style={{ marginTop: "6px", background: "none", border: "none", color: "#a78bfa", fontSize: "12px", cursor: "pointer", padding: 0 }}>
                Wrong number? Go back
              </button>
            </div>
          )}
          {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#f87171", marginBottom: "16px" }}>{error}</div>}
          {!otpSent && (
            <div style={{ background: "rgba(124,110,245,0.08)", border: "1px solid rgba(124,110,245,0.2)", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "hsl(215 20% 65%)", marginBottom: "16px" }}>
              📱 We'll send a one-time code via SMS. Standard messaging rates apply.
            </div>
          )}
          <button type="submit" disabled={loading} style={{ width: "100%", background: "#7c3aed", color: "white", padding: "12px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", border: "none", cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "..." : otpSent ? "Verify & Create Account" : "Send SMS Code"}
          </button>
        </form>
      )}

      <p style={{ textAlign: "center", marginTop: "24px", fontSize: "14px", color: "hsl(215 20% 65%)" }}>
        Already have an account? <Link href="/login" style={{ color: "#a78bfa", fontWeight: "600", textDecoration: "none" }}>Sign in</Link>
      </p>
    </div>
  )
}
