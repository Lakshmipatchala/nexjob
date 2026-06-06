"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"

const NAV_ITEMS = [
  { href: "/dashboard", icon: "🏠", label: "Home", exact: true },
  { href: "/dashboard/recommendations", icon: "🎯", label: "For You", badge: "AI" },
  { href: "/dashboard/jobs", icon: "💼", label: "Jobs" },
  { href: "/dashboard/resume", icon: "📄", label: "AI Resume" },
  { href: "/dashboard/resumes", icon: "🗂️", label: "My Resumes" },
  { href: "/dashboard/cover-letter", icon: "✉️", label: "Cover Letter" },
  { href: "/dashboard/chat", icon: "💬", label: "AI Coach" },
  { href: "/dashboard/applications", icon: "📋", label: "Applications" },
  { href: "/dashboard/saved", icon: "🔖", label: "Saved Jobs" },
  { href: "/dashboard/profile", icon: "⚙️", label: "Settings" },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [collapsed, setCollapsed] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUser(data.user)
        // Try profile with retries
        for (let i = 0; i < 3; i++) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("first_name, last_name, desired_title")
            .eq("id", data.user.id)
            .single()
          if (prof) { setProfile(prof); break }
          await new Promise(r => setTimeout(r, 500))
        }
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const W = collapsed ? "64px" : "220px"

  return (
    <aside style={{
      width: W, minWidth: W, maxWidth: W,
      minHeight: "100vh",
      background: "hsl(228 25% 8%)",
      borderRight: "1px solid hsl(228 20% 14%)",
      display: "flex", flexDirection: "column" as const,
      transition: "width 0.2s, min-width 0.2s, max-width 0.2s",
      position: "sticky" as const, top: 0, flexShrink: 0, zIndex: 50,
      overflowX: "hidden",
    }}>

      {/* Logo + collapse */}
      <div style={{ padding: collapsed ? "18px 0" : "18px 16px", borderBottom: "1px solid hsl(228 20% 14%)", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", minHeight: "60px" }}>
        {!collapsed && (
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: "20px", fontWeight: "700", color: "white", letterSpacing: "-0.5px" }}>
              Nex<span style={{ color: "#9b8ff4" }}>Job</span>
            </span>
          </Link>
        )}
        <button onClick={() => setCollapsed(!collapsed)}
          style={{ background: "hsl(228 20% 14%)", border: "1px solid hsl(228 20% 20%)", color: "hsl(220 15% 60%)", cursor: "pointer", fontSize: "12px", padding: "5px 8px", borderRadius: "6px", lineHeight: 1, flexShrink: 0 }}>
          {collapsed ? "▶" : "◀"}
        </button>
      </div>

      {/* User card */}
      {!collapsed && user && (
        <div style={{ padding: "12px 16px", borderBottom: "1px solid hsl(228 20% 14%)", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "linear-gradient(135deg, #7c6ff0, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "600", color: "white", flexShrink: 0 }}>
            {(profile?.first_name || user.email)?.[0]?.toUpperCase()}
          </div>
          <div style={{ overflow: "hidden", flex: 1 }}>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "white", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>
              {profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : user.email?.split("@")[0]}
            </div>
            <div style={{ fontSize: "11px", color: "hsl(220 15% 55%)", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>
              {profile?.desired_title || "Set your target role"}
            </div>
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "8px", overflowY: "auto" as const }}>
        {NAV_ITEMS.map(item => {
          const active = isActive(item.href, item.exact)
          return (
            <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}
              style={{
                display: "flex", alignItems: "center",
                gap: collapsed ? "0" : "10px",
                padding: collapsed ? "10px 0" : "9px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: "8px", marginBottom: "2px",
                textDecoration: "none",
                background: active ? "rgba(124,111,240,0.18)" : "transparent",
                color: active ? "#a78bfa" : "hsl(220 15% 60%)",
                border: active ? "1px solid rgba(124,111,240,0.25)" : "1px solid transparent",
                fontSize: "13px", fontWeight: active ? "600" : "400",
                transition: "all 0.1s",
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "hsl(228 20% 14%)"; e.currentTarget.style.color = "white" } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "hsl(220 15% 60%)" } }}>
              <span style={{ fontSize: "16px", flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && (
                <span style={{ flex: 1 }}>{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span style={{ background: "rgba(124,111,240,0.25)", color: "#a78bfa", fontSize: "10px", fontWeight: "700", padding: "2px 6px", borderRadius: "20px" }}>
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div style={{ padding: "8px", borderTop: "1px solid hsl(228 20% 14%)" }}>
        <button onClick={handleSignOut} title={collapsed ? "Sign out" : undefined}
          style={{ display: "flex", alignItems: "center", gap: collapsed ? "0" : "10px", width: "100%", padding: collapsed ? "10px 0" : "9px 12px", justifyContent: collapsed ? "center" : "flex-start", borderRadius: "8px", background: "transparent", border: "1px solid transparent", color: "hsl(220 15% 50%)", cursor: "pointer", fontSize: "13px", transition: "all 0.1s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#f87171" }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "hsl(220 15% 50%)" }}>
          <span style={{ fontSize: "16px" }}>🚪</span>
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}