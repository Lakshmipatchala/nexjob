import Link from "next/link"

export default function DashboardPage() {
  return (
    <div style={{minHeight:"100vh",background:"hsl(224 71% 4%)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <h1 style={{fontSize:"32px",fontWeight:"700",color:"hsl(213 31% 91%)",marginBottom:"8px"}}>
          Welcome to NexJob
        </h1>
        <p style={{color:"hsl(215 20% 65%)",fontSize:"16px",marginBottom:"32px"}}>
          Your AI-powered job portal
        </p>
        <div style={{display:"flex",gap:"16px",justifyContent:"center",flexWrap:"wrap"}}>
          <Link href="/dashboard/jobs" style={{background:"#7c3aed",color:"white",padding:"12px 28px",borderRadius:"10px",fontSize:"15px",fontWeight:"600",textDecoration:"none"}}>
            Browse Jobs
          </Link>
          <Link href="/dashboard/resume" style={{background:"linear-gradient(135deg, #7c3aed, #a855f7)",color:"white",padding:"12px 28px",borderRadius:"10px",fontSize:"15px",fontWeight:"600",textDecoration:"none"}}>
            AI Resume Builder
          </Link>
        </div>
      </div>
    </div>
  )
}