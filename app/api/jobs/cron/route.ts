import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const QUERIES = [
  "software engineer", "data engineer", "devops engineer",
  "frontend developer", "backend developer", "full stack developer",
  "data scientist", "machine learning engineer", "product manager",
  "qa engineer", "cloud architect", "cybersecurity engineer",
  "mobile developer", "react developer", "python developer",
  "java developer", "nodejs developer", "solution architect"
]

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results: Record<string, number> = {}
  
  // Pick 3 random queries each run to spread across categories
  const selected = QUERIES.sort(() => Math.random() - 0.5).slice(0, 3)
  
  for (const query of selected) {
    try {
      const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/fetch?query=${encodeURIComponent(query)}&country=US`
      const res = await fetch(url)
      const data = await res.json()
      results[query] = data.saved || 0
    } catch (e) {
      results[query] = 0
    }
  }

  return NextResponse.json({ 
    success: true, 
    queries: selected,
    results,
    total: Object.values(results).reduce((a, b) => a + b, 0)
  })
}