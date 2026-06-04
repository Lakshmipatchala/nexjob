"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleGoogleSignup() {
    setGoogleLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` }
    })
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/dashboard`
      }
    })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.user && data.session) {
      const parts = name.split(" ")
      await supabase.from("profiles").insert({
        id: data.user.id, email,
        first_name: parts[0] || "",
        last_name: parts.slice(1).join(" ") || "",
      })
      window.location.href = "/dashboard"
    } else if (data.user && !data.session) {
      setShowConfirm(true)
      setLoading(false)
    }
  }

  const inp = {
    width:"100%", background:"hsl(224 71% 8%)",
    border:"1px solid hsl(216 34% 17%)", borderRadius:"10px",
    padding:"11px 14px", color:"hsl(213 31% 91%)", fontSize:"14px",
    outline:"none", boxSizing:"border-box" as const, marginBottom:"16px"
  }
  const lbl = {
    display:"block" as const, fontSize:"13px",
    color:"hsl(215 20% 65%)", marginBottom:"6px", fontWeight:"500" as const
  }

  if (showConfirm) {
    return (
      <div style={{width:"100%", maxWidth:"420px", background:"hsl(224 71% 6%)", border:"1px solid hsl(216 34% 17%)", borderRadius:"16px", padding:"40px", textAlign:"center" as const}}>
        <div style={{fontSize:"48px", marginBottom:"16px"}}>📧</div>
        <h2 style={{fontSize:"22px", fontWeight:"700", color:"hsl(213 31% 91%)", marginBottom:"10px"}}>Check your email</h2>
        <p style={{color:"hsl(215 20% 65%)", fontSize:"14px", lineHeight:"1.6", marginBottom:"20px"}}>
          We sent a confirmation link to <strong style={{color:"#a78bfa"}}>{email}</strong>. Click it to activate your account.
        </p>
        <Link href="/login" style={{display:"block", background:"#7c3aed", color:"white", padding:"12px", borderRadius:"10px", fontSize:"14px", fontWeight:"600", textDecoration:"none"}}>
          Go to Sign in
        </Link>
      </div>
    )
  }

  return (
    <div style={{width:"100%", maxWidth:"420px", background:"hsl(224 71% 6%)", border:"1px solid hsl(216 34% 17%)", borderRadius:"16px", padding:"40px"}}>
      <div style={{marginBottom:"32px", textAlign:"center" as const}}>
        <h1 style={{fontSize:"28px", fontWeight:"700", background:"linear-gradient(135deg, #8b5cf6, #a855f7)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:"8px"}}>NexJob</h1>
        <p style={{color:"hsl(215 20% 65%)", fontSize:"15px"}}>Create your account</p>
      </div>

      {/* Google Signup — PRIMARY */}
      <button onClick={handleGoogleSignup} disabled={googleLoading}
        style={{width:"100%", background:"white", color:"#333", padding:"13px", borderRadius:"10px", fontSize:"15px", fontWeight:"600", border:"1px solid #ddd", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px", marginBottom:"12px", opacity:googleLoading?0.7:1}}>
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        {googleLoading ? "Redirecting..." : "Sign up with Google"}
      </button>

      <div style={{textAlign:"center" as const, marginBottom:"20px"}}>
        <span style={{fontSize:"11px", background:"rgba(34,197,94,0.1)", color:"#4ade80", padding:"3px 10px", borderRadius:"20px", border:"1px solid rgba(34,197,94,0.2)"}}>
          ✓ Fastest — no email confirmation needed
        </span>
      </div>

      <div style={{display:"flex", alignItems:"center", gap:"12px", marginBottom:"16px"}}>
        <div style={{flex:1, height:"1px", background:"hsl(216 34% 17%)"}}></div>
        <span style={{fontSize:"12px", color:"hsl(215 20% 45%)"}}>or sign up with email</span>
        <div style={{flex:1, height:"1px", background:"hsl(216 34% 17%)"}}></div>
      </div>

      <form onSubmit={handleSignup}>
        <div style={{marginBottom:"16px"}}>
          <label style={lbl}>Full name</label>
          <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Alex Kim" required style={inp}/>
        </div>
        <div style={{marginBottom:"16px"}}>
          <label style={lbl}>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" required style={inp}/>
        </div>
        <div style={{marginBottom:"24px"}}>
          <label style={lbl}>Password</label>
          <div style={{position:"relative" as const}}>
            <input type={showPassword?"text":"password"} value={password}
              onChange={e=>setPassword(e.target.value)} placeholder="Min 6 characters"
              required minLength={6} style={{...inp, marginBottom:"0", paddingRight:"44px"}}/>
            <button type="button" onClick={()=>setShowPassword(!showPassword)}
              style={{position:"absolute" as const, right:"12px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"hsl(215 20% 65%)", fontSize:"16px"}}>
              {showPassword?"🙈":"👁️"}
            </button>
          </div>
        </div>

        {error && (
          <div style={{background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"8px", padding:"10px 14px", fontSize:"13px", color:"#f87171", marginBottom:"16px"}}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}
          style={{width:"100%", background:"#7c3aed", color:"white", padding:"12px", borderRadius:"10px", fontSize:"14px", fontWeight:"600", border:"none", cursor:"pointer", opacity:loading?0.7:1}}>
          {loading?"Creating account...":"Create account with Email"}
        </button>
      </form>

      <p style={{textAlign:"center" as const, marginTop:"20px", fontSize:"14px", color:"hsl(215 20% 65%)"}}>
        Already have an account?{" "}
        <Link href="/login" style={{color:"#a78bfa", fontWeight:"600", textDecoration:"none"}}>Sign in</Link>
      </p>
    </div>
  )
}