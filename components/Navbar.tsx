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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  const navLink = (href: string, label: string) => (
    <Link key={href} href={href} style={{
      padding: "6px 14px", borderRadius: "8px", fontSize: "14px",
      textDecoration: "none", fontWeight: "500",
      background: isActive(href) ? "rgba(124,58,237,0.2)" : "transparent",
      color: isActive(href) ? "#a78bfa" : "hsl(215 20% 65%)",
      border: isActive(href) ? "1px solid rgba(124,58,237,0.3)" : "1px solid transparent",
    }}>
      {label}
    </Link>
  )

  return (
    <nav style={{ background: "hsl(224 71% 6%)", borderBottom: "1px solid hsl(216 34% 17%)", padding: "0 32px", display: "flex", alignItems: "center", height: "60px", position: "sticky" as const, top: 0, zIndex: 100 }}>
      <Link href="/dashboard" style={{ textDecoration: "none" }}>
        <span style={{ fontSize: "20px", fontWeight: "700", background: "linear-gradient(135deg, #8b5cf6, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          NexJob
        </span>
      </Link>
      <div style={{ display: "flex", gap: "4px", marginLeft: "32px" }}>
        {navLink("/dashboard", "Home")}
        {navLink("/dashboard/jobs", "Jobs")}
        {navLink("/dashboard/resume", "AI Resume")}
        {navLink("/dashboard/recommendations", "🎯 For You")}
        {navLink("/dashboard/recommendations", "🎯 For You")}
        {navLink("/dashboard/cover-letter", "Cover Letter")}
        {navLink("/dashboard/applications", "Applications")}
        {navLink("/dashboard/saved", "Saved")}
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
        {user && <span style={{ fontSize: "13px", color: "hsl(215 20% 65%)" }}>{user.email || user.phone}</span>}
        <div style={{ position: "relative" as const }}>
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #a855f7)", border: "none", cursor: "pointer", color: "white", fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {user?.email?.[0]?.toUpperCase() || user?.phone?.[0] || "U"}
          </button>
          {menuOpen && (
            <div style={{ position: "absolute" as const, right: 0, top: "44px", background: "hsl(224 71% 6%)", border: "1px solid hsl(216 34% 17%)", borderRadius: "10px", padding: "6px", minWidth: "180px", zIndex: 200 }}>
              <div style={{ padding: "8px 12px", fontSize: "12px", color: "hsl(215 20% 45%)", borderBottom: "1px solid hsl(216 34% 17%)", marginBottom: "4px" }}>
                {user?.email || user?.phone}
              </div>
              {[
                ["/dashboard", "Dashboard"],
                ["/dashboard/jobs", "Browse Jobs"],
                ["/dashboard/resume", "AI Resume"],
                ["/dashboard/cover-letter", "Cover Letter"],
                ["/dashboard/applications", "Applications"],
                ["/dashboard/saved", "Saved Jobs"],
                ["/dashboard/profile", "Profile & Settings"],
              ].map(([href, label]) => (
                <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                  style={{ display: "block", padding: "8px 12px", fontSize: "14px", color: "hsl(213 31% 91%)", textDecoration: "none", borderRadius: "6px" }}>
                  {label}
                </Link>
              ))}
              <div style={{ borderTop: "1px solid hsl(216 34% 17%)", marginTop: "4px", paddingTop: "4px" }}>
                <button onClick={handleSignOut}
                  style={{ display: "block", width: "100%", textAlign: "left" as const, padding: "8px 12px", fontSize: "14px", color: "#f87171", background: "none", border: "none", cursor: "pointer", borderRadius: "6px" }}>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}