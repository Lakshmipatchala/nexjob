import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const ALL_QUERIES = [
  // Software Engineering
  "software engineer", "software developer", "software architect",
  "senior software engineer", "staff software engineer", "principal software engineer",
  // Data
  "data engineer", "senior data engineer", "data platform engineer",
  "ETL developer", "data warehouse engineer", "databricks engineer",
  "snowflake developer", "dbt developer", "spark engineer",
  "kafka engineer", "data pipeline engineer", "analytics engineer",
  // AI / ML
  "AI engineer", "artificial intelligence engineer", "machine learning engineer",
  "ML ops engineer", "deep learning engineer", "NLP engineer",
  "computer vision engineer", "LLM engineer", "generative AI engineer",
  "AI researcher", "data scientist", "senior data scientist",
  "applied scientist", "research scientist",
  // Frontend
  "frontend developer", "frontend engineer", "react developer",
  "angular developer", "vue developer", "nextjs developer",
  "typescript developer", "javascript developer", "UI developer", "web developer",
  // Backend
  "backend developer", "backend engineer", "python developer",
  "java developer", "golang developer", "nodejs developer",
  "ruby on rails developer", "scala developer", "C++ developer",
  "rust developer", "php developer",
  // Full Stack
  "full stack developer", "full stack engineer", "MERN stack developer",
  // DevOps / Cloud
  "devops engineer", "site reliability engineer", "platform engineer",
  "infrastructure engineer", "cloud engineer", "AWS engineer",
  "azure engineer", "GCP engineer", "kubernetes engineer",
  "docker engineer", "terraform engineer", "CI CD engineer",
  // QA
  "QA engineer", "QA automation engineer", "test engineer",
  "SDET engineer", "automation engineer", "performance test engineer",
  // Mobile
  "mobile developer", "iOS developer", "android developer",
  "react native developer", "flutter developer",
  // Security
  "cybersecurity engineer", "security engineer", "penetration tester",
  "cloud security engineer",
  // Database
  "database administrator", "database engineer",
  "postgresql developer", "mongodb developer",
  // Architecture & Leadership
  "solutions architect", "cloud architect", "enterprise architect",
  "engineering manager", "technical lead", "product manager technology",
  "technical program manager", "scrum master",
  // Analytics
  "business analyst IT", "data analyst", "business intelligence developer",
  "BI engineer", "tableau developer", "power BI developer",
  // Niche
  "blockchain developer", "web3 developer", "game developer",
  "unity developer", "embedded systems engineer", "firmware engineer",
  "robotics engineer", "AR VR developer",
  // Enterprise
  "SAP developer", "salesforce developer", "ServiceNow developer",
]

// Distribute 15 queries per hour evenly across the full list
function getHourlyQueries(): string[] {
  const hour = new Date().getUTCHours()
  const start = (hour * 15) % ALL_QUERIES.length
  const queries: string[] = []
  for (let i = 0; i < 15; i++) {
    queries.push(ALL_QUERIES[(start + i) % ALL_QUERIES.length])
  }
  return queries
}

// Country groups rotated by day-of-week to spread load
const COUNTRY_GROUPS: Record<number, string> = {
  0: "US",       // Sunday
  1: "GB",       // Monday
  2: "IN",       // Tuesday
  3: "DE",       // Wednesday  (covers EU via JSearch + Adzuna)
  4: "AE",       // Thursday   (covers Gulf region)
  5: "CA",       // Friday
  6: "GLOBAL",   // Saturday   (catch-all: all countries)
}

function getTodayCountry(): string {
  return COUNTRY_GROUPS[new Date().getUTCDay()] ?? "GLOBAL"
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    // Remove jobs older than 30 days
    const { error: cleanupError } = await supabase
      .from("jobs")
      .delete()
      .lt("expires_at", new Date().toISOString())

    if (cleanupError) {
      console.error("Cleanup error:", cleanupError.message)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nexjob-sigma.vercel.app"
    const queries = getHourlyQueries()
    const country = getTodayCountry()
    let totalFetched = 0
    const results: { query: string; count?: number; sources?: Record<string, number>; error?: string }[] = []

    for (const query of queries) {
      try {
        const res = await fetch(
          `${baseUrl}/api/jobs/fetch?query=${encodeURIComponent(query)}&country=${country}`,
          {
            headers: { "x-cron-source": "internal" },
            cache: "no-store",
          }
        )
        const data = await res.json()
        if (data.success) {
          totalFetched += data.saved || 0
          results.push({ query, count: data.saved, sources: data.sources })
        } else {
          results.push({ query, error: data.error || "fetch failed" })
        }
      } catch (e) {
        results.push({ query, error: String(e) })
      }
    }

    return NextResponse.json({
      success: true,
      hour: new Date().getUTCHours(),
      day: new Date().getUTCDay(),
      country_focus: country,
      queries_run: queries,
      total_fetched: totalFetched,
      results,
      message: `Cron: fetched ${totalFetched} jobs for ${queries.length} queries (country focus: ${country})`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
