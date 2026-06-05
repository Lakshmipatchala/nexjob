import Link from "next/link"

export default function LandingPage() {
  return (
    <div style={{minHeight:"100vh", background:"hsl(224 71% 4%)"}}>

      {/* Top navbar */}
      <nav style={{display:"flex", alignItems:"center", padding:"0 32px", height:"60px", borderBottom:"1px solid hsl(216 34% 17%)", background:"hsl(224 71% 6%)"}}>
        <span style={{fontSize:"20px", fontWeight:"700", background:"linear-gradient(135deg, #8b5cf6, #a855f7)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"}}>
          NexJob
        </span>
        <div style={{marginLeft:"auto", display:"flex", gap:"10px"}}>
          <Link href="/login"
            style={{padding:"8px 20px", borderRadius:"8px", fontSize:"14px", color:"hsl(213 31% 91%)", textDecoration:"none", border:"1px solid hsl(216 34% 17%)", fontWeight:"500"}}>
            Sign in
          </Link>
          <Link href="/signup"
            style={{padding:"8px 20px", borderRadius:"8px", fontSize:"14px", color:"white", textDecoration:"none", background:"#7c3aed", fontWeight:"500"}}>
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main style={{display:"flex", flexDirection:"column" as const, alignItems:"center", justifyContent:"center", minHeight:"calc(100vh - 60px)", padding:"32px", textAlign:"center" as const}}>
        <div style={{marginBottom:"16px", display:"inline-block", background:"rgba(124,110,245,0.1)", border:"1px solid rgba(124,110,245,0.2)", borderRadius:"20px", padding:"6px 16px", fontSize:"13px", color:"#a78bfa"}}>
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

        <div style={{display:"flex", gap:"14px", flexWrap:"wrap" as const, justifyContent:"center", marginBottom:"48px"}}>
          <Link href="/signup"
            style={{background:"linear-gradient(135deg, #7c3aed, #a855f7)", color:"white", padding:"14px 32px", borderRadius:"10px", fontSize:"16px", fontWeight:"600", textDecoration:"none"}}>
            Get started free
          </Link>
          <Link href="/login"
            style={{border:"1px solid hsl(216 34% 17%)", color:"hsl(213 31% 91%)", padding:"14px 32px", borderRadius:"10px", fontSize:"16px", fontWeight:"600", textDecoration:"none"}}>
            Sign in
          </Link>
        </div>

        {/* Feature cards */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"16px", maxWidth:"800px", width:"100%"}}>
          {[
            { icon:"🔍", title:"Multi-portal search", desc:"Jobs from LinkedIn, Indeed, Glassdoor, Greenhouse, Lever and more" },
            { icon:"🤖", title:"AI resume builder", desc:"Claude rewrites your full resume tailored to each job description" },
            { icon:"⚡", title:"1-click autofill", desc:"Browser extension fills job applications automatically" },
          ].map((f, i) => (
            <div key={i} style={{background:"hsl(224 71% 6%)", border:"1px solid hsl(216 34% 17%)", borderRadius:"12px", padding:"20px", textAlign:"left" as const}}>
              <div style={{fontSize:"28px", marginBottom:"10px"}}>{f.icon}</div>
              <div style={{fontSize:"15px", fontWeight:"600", color:"hsl(213 31% 91%)", marginBottom:"6px"}}>{f.title}</div>
              <div style={{fontSize:"13px", color:"hsl(215 20% 65%)", lineHeight:"1.5"}}>{f.desc}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}