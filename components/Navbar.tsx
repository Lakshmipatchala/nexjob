"use client"
import { createClient } from "@/lib/supabase"
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"

export default function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const navLink = (href: string, label: string) => {
    const active = pathname === href
    return (
      <Link href={href} style={{padding:"6px 14px", borderRadius:"8px", fontSize:"14px",
        color: active ? "#a78bfa" : "hsl(215 20% 65%)",
        background: active ? "rgba(124,110,245,0.1)" : "transparent",
        textDecoration:"none", fontWeight: active ? "600" : "500"}}>
        {label}
      </Link>
    )
  }

  return (
    <nav style={{background:"hsl(224 71% 6%)", borderBottom:"1px solid hsl(216 34% 17%)", padding:"0 32px", display:"flex", alignItems:"center", height:"60px", position:"sticky" as const, top:0, zIndex:100}}>
      <Link href="/dashboard" style={{textDecoration:"none", marginRight:"8px"}}>
        <span style={{fontSize:"20px", fontWeight:"700", background:"linear-gradient(135deg, #8b5cf6, #a855f7)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"}}>
          NexJob
        </span>
      </Link>

      <div style={{display:"flex", gap:"2px", marginLeft:"16px"}}>
        {navLink("/dashboard", "Home")}
        {navLink("/dashboard/jobs", "Jobs")}
        {navLink("/dashboard/resume", "AI Resume")}
        {navLink("/dashboard/applications", "Applications")}
        {navLink("/dashboard/saved", "Saved")}
      </div>

      <div style={{marginLeft:"auto", display:"flex", alignItems:"center", gap:"12px"}}>
        {user && <span style={{fontSize:"13px", color:"hsl(215 20% 65%)", display:"none"}}>
          {user.email}
        </span>}

        <div style={{position:"relative" as const}}>
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{width:"36px", height:"36px", borderRadius:"50%", background:"linear-gradient(135deg, #7c3aed, #a855f7)", border:"none", cursor:"pointer", color:"white", fontSize:"14px", fontWeight:"700", display:"flex", alignItems:"center", justifyContent:"center"}}>
            {user?.user_metadata?.avatar_url
              ? <img src={user.user_metadata.avatar_url} style={{width:"36px", height:"36px", borderRadius:"50%", objectFit:"cover"}}/>
              : user?.email?.[0]?.toUpperCase() || "U"}
          </button>

          {menuOpen && (
            <div style={{position:"absolute" as const, right:0, top:"44px", background:"hsl(224 71% 6%)", border:"1px solid hsl(216 34% 17%)", borderRadius:"10px", padding:"6px", minWidth:"200px", zIndex:200, boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}>
              <div style={{padding:"8px 12px", fontSize:"12px", color:"hsl(215 20% 45%)", borderBottom:"1px solid hsl(216 34% 17%)", marginBottom:"4px"}}>
                {user?.email}
              </div>
              {[
                { href:"/dashboard", label:"🏠 Dashboard" },
                { href:"/dashboard/jobs", label:"🔍 Browse Jobs" },
                { href:"/dashboard/resume", label:"🤖 AI Resume" },
                { href:"/dashboard/applications", label:"📋 Applications" },
                { href:"/dashboard/saved", label:"❤️ Saved Jobs" },
                { href:"/dashboard/profile", label:"👤 Profile" },
              ].map(item => (
                <Link key={item.href} href={item.href} onClick={()=>setMenuOpen(false)}
                  style={{display:"block", padding:"8px 12px", fontSize:"14px", color:"hsl(213 31% 91%)", textDecoration:"none", borderRadius:"6px"}}>
                  {item.label}
                </Link>
              ))}
              <div style={{borderTop:"1px solid hsl(216 34% 17%)", marginTop:"4px", paddingTop:"4px"}}>
                <button onClick={handleSignOut}
                  style={{display:"block", width:"100%", textAlign:"left" as const, padding:"8px 12px", fontSize:"14px", color:"#f87171", background:"none", border:"none", cursor:"pointer", borderRadius:"6px"}}>
                  🚪 Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}