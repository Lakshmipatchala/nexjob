"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push("/dashboard")
  }

  const inputStyle = {width:"100%",background:"hsl(224 71% 8%)",border:"1px solid hsl(216 34% 17%)",borderRadius:"10px",padding:"11px 14px",color:"hsl(213 31% 91%)",fontSize:"14px",outline:"none",boxSizing:"border-box" as const}
  const labelStyle = {display:"block" as const,fontSize:"13px",color:"hsl(215 20% 65%)",marginBottom:"6px",fontWeight:"500" as const}

  return (
    <div style={{width:"100%",maxWidth:"420px",background:"hsl(224 71% 6%)",border:"1px solid hsl(216 34% 17%)",borderRadius:"16px",padding:"40px"}}>
      <div style={{marginBottom:"32px",textAlign:"center" as const}}>
        <h1 style={{fontSize:"28px",fontWeight:"700",background:"linear-gradient(135deg, #8b5cf6, #a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:"8px"}}>NexJob</h1>
        <p style={{color:"hsl(215 20% 65%)",fontSize:"15px"}}>Welcome back</p>
      </div>
      <form onSubmit={handleLogin}>
        <div style={{marginBottom:"16px"}}><label style={labelStyle}>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" required style={inputStyle}/></div>
        <div style={{marginBottom:"24px"}}><label style={labelStyle}>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password" required style={inputStyle}/></div>
        {error && <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"8px",padding:"10px 14px",fontSize:"13px",color:"#f87171",marginBottom:"16px"}}>{error}</div>}
        <button type="submit" disabled={loading} style={{width:"100%",background:"#7c3aed",color:"white",padding:"12px",borderRadius:"10px",fontSize:"14px",fontWeight:"600",border:"none",cursor:"pointer",opacity:loading?0.7:1}}>{loading?"Signing in...":"Sign in"}</button>
      </form>
      <p style={{textAlign:"center",marginTop:"24px",fontSize:"14px",color:"hsl(215 20% 65%)"}}>No account yet? <Link href="/signup" style={{color:"#a78bfa",fontWeight:"600",textDecoration:"none"}}>Create one</Link></p>
    </div>
  )
}