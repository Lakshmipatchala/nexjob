"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"
import { useRouter } from "next/navigation"

type AuthMode = "email" | "phone"

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("email")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const router = useRouter()

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.session) { router.refresh(); router.push("/dashboard") }
    setLoading(false)
  }

  async function handleGoogleLogin() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const supabase = createClient()
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
    const supabase = createClient()
    const formatted = phone.startsWith("+") ? phone : `+1${phone.replace(/\D/g, "")}`
    const { data, error } = await supabase.auth.verifyOtp({ phone: formatted, token: otp, type: "sms" })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.session) { router.refresh(); router.push("/dashboard") }
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
        <p style={{ color: "hsl(215 20% 65%)", fontSize: "15px" }}>Welcome back</p>
      </div>

      {/* Google Sign In */}
      <button onClick={handleGoogleLogin} disabled={loading}
        style={{ width: "100%", background: "white", color: "#1a1a1a", padding: "11px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", border: "1px solid #ddd", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "20px" }}>
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-9 20-20 0-1.3-.1-2.7-.4-4z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.1 0-9.5-2.9-11.2-7.1l-6.5 5C9.8 39.7 16.4 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.6-2.6 4.7-4.9 6.2l6.2 5.2C40.2 36.1 44 30.5 44 24c0-1.3-.1-2.7-.4-4z"/>
        </svg>
        Continue with Google
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <div style={{ flex: 1, height: "1px", background: "hsl(216 34% 17%)" }} />
        <span style={{ fontSize: "12px", color: "hsl(215 20% 45%)" }}>or sign in with</span>
        <div style={{ flex: 1, height: "1px", background: "hsl(216 34% 17%)" }} />
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", background: "hsl(224 71% 4%)", borderRadius: "10px", padding: "4px" }}>
        <button style={mode === "email" ? tabActive : tabInactive} onClick={() => setMode("email")}>📧 Email</button>
        <button style={mode === "phone" ? tabActive : tabInactive} onClick={() => setMode("phone")}>📱 Phone SMS</button>
      </div>

      {mode === "email" ? (
        <form onSubmit={handleEmailLogin}>
          <div style={{ marginBottom: "16px" }}><label style={labelStyle}>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required style={inputStyle} /></div>
          <div style={{ marginBottom: "24px" }}><label style={labelStyle}>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" required style={inputStyle} /></div>
          {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#f87171", marginBottom: "16px" }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: "100%", background: "#7c3aed", color: "white", padding: "12px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", border: "none", cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      ) : (
        <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Phone number</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" required disabled={otpSent} style={{ ...inputStyle, opacity: otpSent ? 0.6 : 1 }} />
          </div>
          {otpSent && (
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Enter the 6-digit code</label>
              <input type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456" maxLength={6} required style={inputStyle} />
              <button type="button" onClick={() => setOtpSent(false)} style={{ marginTop: "6px", background: "none", border: "none", color: "#a78bfa", fontSize: "12px", cursor: "pointer", padding: 0 }}>Wrong number?</button>
            </div>
          )}
          {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#f87171", marginBottom: "16px" }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: "100%", background: "#7c3aed", color: "white", padding: "12px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", border: "none", cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "..." : otpSent ? "Verify Code" : "Send SMS Code"}
          </button>
        </form>
      )}

      <p style={{ textAlign: "center", marginTop: "16px", fontSize: "14px", color: "hsl(215 20% 65%)" }}>
        No account yet? <Link href="/signup" style={{ color: "#a78bfa", fontWeight: "600", textDecoration: "none" }}>Create one</Link>
      </p>
    </div>
  )
}