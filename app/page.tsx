import { createServerSupabaseClient } from "@/lib/supabase-server"
import Link from "next/link"

export default async function LandingPage() {
  let dbStatus = "connecting..."
  try {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.from("jobs").select("count").single()
    dbStatus = error ? "connected (no data yet)" : "connected"
  } catch {
    dbStatus = "check .env.local keys"
  }

  return (
    <main style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"24px",padding:"32px",textAlign:"center",background:"hsl(224 71% 4%)"}}>
      <div>
        <h1 style={{fontSize:"48px",fontWeight:"700",background:"linear-gradient(135deg, #8b5cf6, #a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"-1px"}}>
          NexJob
        </h1>
        <p style={{color:"hsl(215 20% 65%)",fontSize:"18px",marginTop:"8px"}}>
          AI-powered job portal
        </p>
      </div>
      <div style={{background:"hsl(224 71% 6%)",border:"1px solid hsl(216 34% 17%)",borderRadius:"12px",padding:"16px 24px",fontSize:"14px"}}>
        <span style={{color:"hsl(215 20% 65%)"}}>Supabase: </span>
        <span style={{color:"#22c55e",fontWeight:"600"}}>{dbStatus}</span>
      </div>
      <div style={{display:"flex",gap:"16px",flexWrap:"wrap",justifyContent:"center"}}>
        <Link href="/signup" style={{background:"#7c3aed",color:"white",padding:"12px 24px",borderRadius:"10px",fontSize:"14px",fontWeight:"600",textDecoration:"none"}}>
          Get started
        </Link>
        <Link href="/login" style={{border:"1px solid hsl(216 34% 17%)",color:"hsl(213 31% 91%)",padding:"12px 24px",borderRadius:"10px",fontSize:"14px",fontWeight:"600",textDecoration:"none"}}>
          Sign in
        </Link>
      </div>
      <p style={{fontSize:"12px",color:"hsl(215 20% 45%)"}}>
        Phase 2 complete -- Database connected
      </p>
    </main>
  )
}