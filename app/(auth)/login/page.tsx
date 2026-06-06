"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"
import { useRouter } from "next/navigation"

const COUNTRIES = [
  { code: "+1", flag: "US", name: "US/Canada" },
  { code: "+44", flag: "GB", name: "UK" },
  { code: "+91", flag: "IN", name: "India" },
  { code: "+61", flag: "AU", name: "Australia" },
  { code: "+49", flag: "DE", name: "Germany" },
  { code: "+971", flag: "AE", name: "UAE" },
  { code: "+65", flag: "SG", name: "Singapore" },
]

type AuthMode = "email" | "phone"

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("email")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [countryCode, setCountryCode] = useState("+1")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const router = useRouter()

  const fullPhone = `${countryCode}${phone.replace(/\D/g, "")}`

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError("")
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
    setLoading(true); setError("")
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone })
    if (error) { setError(error.message); setLoading(false); return }
    setOtpSent(true); setLoading(false)
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError("")
    const supabase = createClient()
    const { data, error } = await supabase.auth.verifyOtp({ phone: fullPhone, token: otp, type: "sms" })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.session) { router.refresh(); router.push("/dashboard") }
    setLoading(false)
  }

  const inp = {
    width: "100%", background: "hsl(228 25% 10%)",
    border: "1px solid hsl(228 20% 18%)", borderRadius: "10px",
    padding: "12px 14px", color: "white", fontSize: "14px",
    outline: "none", boxSizing: "border-box" as const, marginBottom: "14px",
    fontFamily: "inherit"
  }
  const lbl = { display: "block" as const, fontSize: "12px", color: "hsl(220 15% 55%)", marginBottom: "6px", fontWeight: "500" as const, textTransform: "uppercase" as const, letterSpacing: "0.5px" }

  return (
    <div style={{ background: "hsl(228 25% 9%)", border: "1px solid hsl(228 20% 16%)", borderRadius: "16px", padding: "32px" }}>
      <h2 style={{ fontSize: "20px", fontWeight: "700", color: "white", margin: "0 0 6px", textAlign: "center" as const }}>Welcome back</h2>
      <p style={{ fontSize: "13px", color: "hsl(220 15% 50%)", margin: "0 0 24px", textAlign: "center" as const }}>Sign in to continue your job search</p>

      {/* Google */}
      <button onClick={handleGoogleLogin} disabled={loading}
        style={{ width: "100%", background: "white", color: "#1a1a1a", padding: "12px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "20px" }}>
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-9 20-20 0-1.3-.1-2.7-.4-4z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.1 0-9.5-2.9-11.2-7.1l-6.5 5C9.8 39.7 16.4 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.6-2.6 4.7-4.9 6.2l6.2 5.2C40.2 36.1 44 30.5 44 24c0-1.3-.1-2.7-.4-4z"/>
        </svg>
        Continue with Google
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <div style={{ flex: 1, height: "1px", background: "hsl(228 20% 18%)" }} />
        <span style={{ fontSize: "12px", color: "hsl(220 15% 40%)" }}>or continue with</span>
        <div style={{ flex: 1, height: "1px", background: "hsl(228 20% 18%)" }} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", background: "hsl(228 25% 7%)", borderRadius: "10px", padding: "4px" }}>
        <button style={{ flex: 1, padding: "9px", borderRadius: "7px", border: "none", background: mode === "email" ? "hsl(228 25% 14%)" : "transparent", color: mode === "email" ? "white" : "hsl(220 15% 50%)", fontSize: "13px", fontWeight: "500" as const, cursor: "pointer" }} onClick={() => setMode("email")}>Email</button>
        <button style={{ flex: 1, padding: "9px", borderRadius: "7px", border: "none", background: mode === "phone" ? "hsl(228 25% 14%)" : "transparent", color: mode === "phone" ? "white" : "hsl(220 15% 50%)", fontSize: "13px", fontWeight: "500" as const, cursor: "pointer" }} onClick={() => setMode("phone")}>Phone SMS</button>
      </div>

      {mode === "email" ? (
        <form onSubmit={handleEmailLogin}>
          <label style={lbl}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required style={inp} />
          <label style={lbl}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" required style={{ ...inp, marginBottom: "20px" }} />
          {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#f87171", marginBottom: "14px" }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: "100%", background: "linear-gradient(135deg, #7c6ff0, #a78bfa)", color: "white", padding: "12px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", border: "none", cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      ) : (
        <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
          <label style={lbl}>Phone number</label>
          <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
            <select value={countryCode} onChange={e => setCountryCode(e.target.value)} disabled={otpSent}
              style={{ background: "hsl(228 25% 10%)", border: "1px solid hsl(228 20% 18%)", borderRadius: "10px", padding: "12px 10px", color: "white", fontSize: "13px", outline: "none", cursor: "pointer" }}>
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.code} {c.name}</option>)}
            </select>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="555 000 0000" required disabled={otpSent}
              style={{ ...inp, marginBottom: "0", flex: 1, opacity: otpSent ? 0.6 : 1 }} />
          </div>
          {otpSent && (
            <div style={{ marginBottom: "14px" }}>
              <label style={lbl}>6-digit code</label>
              <input type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456" maxLength={6} required style={inp} />
              <button type="button" onClick={() => setOtpSent(false)} style={{ background: "none", border: "none", color: "#9b8ff4", fontSize: "12px", cursor: "pointer", padding: 0 }}>Wrong number?</button>
            </div>
          )}
          {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#f87171", marginBottom: "14px" }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: "100%", background: "linear-gradient(135deg, #7c6ff0, #a78bfa)", color: "white", padding: "12px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", border: "none", cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "..." : otpSent ? "Verify Code" : "Send SMS Code"}
          </button>
        </form>
      )}

      <p style={{ textAlign: "center" as const, marginTop: "20px", fontSize: "13px", color: "hsl(220 15% 50%)" }}>
        No account? <Link href="/signup" style={{ color: "#9b8ff4", fontWeight: "600", textDecoration: "none" }}>Create one free</Link>
      </p>
    </div>
  )
}