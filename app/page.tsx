import Link from "next/link"
import { createServerSupabaseClient } from "@/lib/supabase-server"

async function getStats() {
  try {
    const supabase = await createServerSupabaseClient()
    const { count: jobCount } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
    const { count: userCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
    return {
      jobs: jobCount || 0,
      users: userCount || 0,
    }
  } catch {
    return { jobs: 0, users: 0 }
  }
}

export default async function LandingPage() {
  const stats = await getStats()

  return (
    <div style={{minHeight:"100vh", background:"hsl(224 71% 4%)"}}>

      {/* Navbar */}
      <nav style={{display:"flex", alignItems:"center", padding:"0 32px", height:"64px", borderBottom:"1px solid hsl(216 34% 17%)", background:"hsl(224 71% 6%)", position:"sticky" as const, top:0, zIndex:100}}>
        <Link href="/" style={{textDecoration:"none"}}>
          <span style={{fontSize:"22px", fontWeight:"700", background:"linear-gradient(135deg, #8b5cf6, #a855f7)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"}}>
            NexJob
          </span>
        </Link>
        <div style={{display:"flex", gap:"4px", marginLeft:"32px"}}>
          <Link href="/dashboard/jobs" style={{padding:"6px 14px", borderRadius:"8px", fontSize:"14px", color:"hsl(215 20% 65%)", textDecoration:"none", fontWeight:"500"}}>Jobs</Link>
          <Link href="/dashboard/resume" style={{padding:"6px 14px", borderRadius:"8px", fontSize:"14px", color:"hsl(215 20% 65%)", textDecoration:"none", fontWeight:"500"}}>AI Resume</Link>
        </div>
        <div style={{marginLeft:"auto", display:"flex", gap:"10px"}}>
          <Link href="/login" style={{padding:"8px 20px", borderRadius:"8px", fontSize:"14px", color:"hsl(213 31% 91%)", textDecoration:"none", border:"1px solid hsl(216 34% 17%)", fontWeight:"500"}}>Sign in</Link>
          <Link href="/signup" style={{padding:"8px 20px", borderRadius:"8px", fontSize:"14px", color:"white", textDecoration:"none", background:"#7c3aed", fontWeight:"500"}}>Get started</Link>
        </div>
      </nav>

      <main style={{display:"flex", flexDirection:"column" as const, alignItems:"center", justifyContent:"center", padding:"80px 32px 60px", textAlign:"center" as const}}>
        <div style={{marginBottom:"20px", display:"inline-block", background:"rgba(124,110,245,0.1)", border:"1px solid rgba(124,110,245,0.2)", borderRadius:"20px", padding:"6px 16px", fontSize:"13px", color:"#a78bfa"}}>
          AI-powered job search
        </div>

        <h1 style={{fontSize:"56px", fontWeight:"700", color:"hsl(213 31% 91%)", lineHeight:"1.1", letterSpacing:"-1px", marginBottom:"20px", maxWidth:"700px"}}>
          Find your dream job with{" "}
          <span style={{background:"linear-gradient(135deg, #8b5cf6, #a855f7)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"}}>
            AI assistance
          </span>
        </h1>

        <p style={{color:"hsl(215 20% 65%)", fontSize:"18px", marginBottom:"36px", maxWidth:"500px", lineHeight:"1.6"}}>
          Aggregates jobs from LinkedIn, Indeed, Glassdoor, Greenhouse, Lever and more. AI tailors your resume for every application.
        </p>

        <div style={{display:"flex", gap:"14px", flexWrap:"wrap" as const, justifyContent:"center", marginBottom:"64px"}}>
          <Link href="/signup" style={{background:"linear-gradient(135deg, #7c3aed, #a855f7)", color:"white", padding:"14px 32px", borderRadius:"10px", fontSize:"16px", fontWeight:"600", textDecoration:"none"}}>
            Get started free
          </Link>
          <Link href="/login" style={{border:"1px solid hsl(216 34% 17%)", color:"hsl(213 31% 91%)", padding:"14px 32px", borderRadius:"10px", fontSize:"16px", fontWeight:"600", textDecoration:"none"}}>
            Sign in
          </Link>
        </div>

        {/* Feature Cards */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"16px", maxWidth:"900px", width:"100%", marginBottom:"48px"}}>
          <Link href="/dashboard/jobs" style={{textDecoration:"none"}}>
            <div style={{background:"hsl(224 71% 6%)", border:"1px solid hsl(216 34% 17%)", borderRadius:"12px", padding:"24px", textAlign:"left" as const, cursor:"pointer", height:"100%"}}>
              <div style={{fontSize:"32px", marginBottom:"12px"}}>🔍</div>
              <div style={{fontSize:"16px", fontWeight:"600", color:"hsl(213 31% 91%)", marginBottom:"8px"}}>Multi-portal search</div>
              <div style={{fontSize:"13px", color:"hsl(215 20% 65%)", lineHeight:"1.5", marginBottom:"12px"}}>Jobs from LinkedIn, Indeed, Glassdoor, Greenhouse, Lever and more</div>
              <div style={{fontSize:"13px", color:"#a78bfa", fontWeight:"500"}}>Browse jobs →</div>
            </div>
          </Link>
          <Link href="/dashboard/resume" style={{textDecoration:"none"}}>
            <div style={{background:"hsl(224 71% 6%)", border:"1px solid hsl(216 34% 17%)", borderRadius:"12px", padding:"24px", textAlign:"left" as const, cursor:"pointer", height:"100%"}}>
              <div style={{fontSize:"32px", marginBottom:"12px"}}>🤖</div>
              <div style={{fontSize:"16px", fontWeight:"600", color:"hsl(213 31% 91%)", marginBottom:"8px"}}>AI resume builder</div>
              <div style={{fontSize:"13px", color:"hsl(215 20% 65%)", lineHeight:"1.5", marginBottom:"12px"}}>Claude rewrites your full resume tailored to each job description</div>
              <div style={{fontSize:"13px", color:"#a78bfa", fontWeight:"500"}}>Build resume →</div>
            </div>
          </Link>
          <Link href="/signup" style={{textDecoration:"none"}}>
            <div style={{background:"hsl(224 71% 6%)", border:"1px solid hsl(216 34% 17%)", borderRadius:"12px", padding:"24px", textAlign:"left" as const, cursor:"pointer", height:"100%"}}>
              <div style={{fontSize:"32px", marginBottom:"12px"}}>⚡</div>
              <div style={{fontSize:"16px", fontWeight:"600", color:"hsl(213 31% 91%)", marginBottom:"8px"}}>1-click autofill</div>
              <div style={{fontSize:"13px", color:"hsl(215 20% 65%)", lineHeight:"1.5", marginBottom:"12px"}}>Browser extension fills job applications automatically</div>
              <div style={{fontSize:"13px", color:"#a78bfa", fontWeight:"500"}}>Get started →</div>
            </div>
          </Link>
        </div>

        {/* LIVE Stats */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:"16px", maxWidth:"700px", width:"100%", marginBottom:"48px"}}>
          {[
            { num: stats.jobs > 0 ? `${stats.jobs}+` : "500+", label:"Active jobs" },
            { num: stats.users > 0 ? `${stats.users}+` : "0", label:"Users signed up" },
            { num:"5+", label:"Job portals" },
            { num:"Free", label:"To get started" },
          ].map((s, i) => (
            <div key={i} style={{background:"hsl(224 71% 6%)", border:"1px solid hsl(216 34% 17%)", borderRadius:"12px", padding:"16px", textAlign:"center" as const}}>
              <div style={{fontSize:"24px", fontWeight:"700", color:"#a78bfa", marginBottom:"4px"}}>{s.num}</div>
              <div style={{fontSize:"12px", color:"hsl(215 20% 65%)"}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div style={{maxWidth:"700px", width:"100%", marginBottom:"48px"}}>
          <h2 style={{fontSize:"28px", fontWeight:"700", color:"hsl(213 31% 91%)", marginBottom:"32px", textAlign:"center" as const}}>How it works</h2>
          <div style={{display:"flex", flexDirection:"column" as const, gap:"16px"}}>
            {[
              { step:"01", title:"Search jobs", desc:"We aggregate listings from LinkedIn, Indeed, Glassdoor, Greenhouse, Lever and more in one place", link:"/dashboard/jobs", cta:"Browse jobs" },
              { step:"02", title:"AI resume builder", desc:"Upload your Word resume and paste a job description — Claude rewrites the full resume tailored to that specific role", link:"/dashboard/resume", cta:"Try AI resume" },
              { step:"03", title:"1-click autofill", desc:"Install our browser extension and autofill job applications on any ATS platform instantly", link:"/signup", cta:"Get started" },
            ].map((item, i) => (
              <Link key={i} href={item.link} style={{textDecoration:"none"}}>
                <div style={{display:"flex", gap:"20px", background:"hsl(224 71% 6%)", border:"1px solid hsl(216 34% 17%)", borderRadius:"12px", padding:"20px", alignItems:"flex-start", cursor:"pointer"}}>
                  <div style={{fontSize:"13px", fontWeight:"700", color:"#a78bfa", background:"rgba(124,110,245,0.1)", border:"1px solid rgba(124,110,245,0.2)", borderRadius:"8px", padding:"6px 10px", flexShrink:0}}>
                    {item.step}
                  </div>
                  <div style={{flex:1, textAlign:"left" as const}}>
                    <div style={{fontSize:"16px", fontWeight:"600", color:"hsl(213 31% 91%)", marginBottom:"6px"}}>{item.title}</div>
                    <div style={{fontSize:"13px", color:"hsl(215 20% 65%)", lineHeight:"1.6", marginBottom:"10px"}}>{item.desc}</div>
                    <span style={{fontSize:"13px", color:"#a78bfa", fontWeight:"500"}}>{item.cta} →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{background:"linear-gradient(135deg, rgba(124,110,245,0.15), rgba(168,85,247,0.15))", border:"1px solid rgba(124,110,245,0.3)", borderRadius:"16px", padding:"48px 32px", textAlign:"center" as const, maxWidth:"600px", width:"100%"}}>
          <h2 style={{fontSize:"28px", fontWeight:"700", color:"hsl(213 31% 91%)", marginBottom:"12px"}}>Ready to find your dream job?</h2>
          <p style={{color:"hsl(215 20% 65%)", fontSize:"15px", marginBottom:"24px"}}>Join thousands of job seekers using AI to land their next role faster.</p>
          <Link href="/signup" style={{display:"inline-block", background:"linear-gradient(135deg, #7c3aed, #a855f7)", color:"white", padding:"14px 40px", borderRadius:"10px", fontSize:"16px", fontWeight:"600", textDecoration:"none"}}>
            Get started free
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer style={{borderTop:"1px solid hsl(216 34% 17%)", padding:"24px 32px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap" as const, gap:"12px"}}>
        <span style={{fontSize:"14px", fontWeight:"700", background:"linear-gradient(135deg, #8b5cf6, #a855f7)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"}}>NexJob</span>
        <div style={{display:"flex", gap:"20px"}}>
          <Link href="/dashboard/jobs" style={{fontSize:"13px", color:"hsl(215 20% 65%)", textDecoration:"none"}}>Browse Jobs</Link>
          <Link href="/dashboard/resume" style={{fontSize:"13px", color:"hsl(215 20% 65%)", textDecoration:"none"}}>AI Resume</Link>
          <Link href="/signup" style={{fontSize:"13px", color:"hsl(215 20% 65%)", textDecoration:"none"}}>Sign Up</Link>
          <Link href="/login" style={{fontSize:"13px", color:"hsl(215 20% 65%)", textDecoration:"none"}}>Login</Link>
        </div>
        <span style={{fontSize:"13px", color:"hsl(215 20% 45%)"}}>© 2026 NexJob. All rights reserved.</span>
      </footer>
    </div>
  )
}