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

// 14-day country rotation — each region gets its own dedicated slot
// Days 0-6 = week 1, days 7-13 = week 2 (based on day-of-fortnight)
const COUNTRY_ROTATION: Record<number, string> = {
  0:  "US",      // Sunday W1    — North America
  1:  "GB",      // Monday W1    — UK
  2:  "IN",      // Tuesday W1   — India
  3:  "DE",      // Wednesday W1 — Germany / Western EU
  4:  "AE",      // Thursday W1  — UAE / Gulf
  5:  "CA",      // Friday W1    — Canada / Australia
  6:  "GLOBAL",  // Saturday W1  — catch-all

  7:  "SG",      // Sunday W2    — Asia-Pacific
  8:  "FR",      // Monday W2    — France / Southern EU
  9:  "SA",      // Tuesday W2   — Saudi Arabia
  10: "PL",      // Wednesday W2 — Eastern EU
  11: "HK",      // Thursday W2  — Hong Kong / JobsDB
  12: "ZA",      // Friday W2    — Africa
  13: "GLOBAL",  // Saturday W2  — catch-all
}

function getTodayCountry(): string {
  const epoch = new Date("2024-01-07") // Sunday as day-0 anchor
  const daysSinceEpoch = Math.floor((Date.now() - epoch.getTime()) / 86_400_000)
  return COUNTRY_ROTATION[daysSinceEpoch % 14] ?? "GLOBAL"
}

// 15 queries per hour, evenly spread across full list
function getHourlyQueries(): string[] {
  const hour = new Date().getUTCHours()
  const start = (hour * 15) % ALL_QUERIES.length
  const queries: string[] = []
  for (let i = 0; i < 15; i++) {
    queries.push(ALL_QUERIES[(start + i) % ALL_QUERIES.length])
  }
  return queries
}

// Fingerprint for cross-source deduplication
function contentHash(title: string, company: string, location: string): string {
  const normalized = `${title}|${company}|${location}`
    .toLowerCase()
    .replace(/[^a-z0-9|]/g, "")
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash + normalized.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(36)
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

    const now = new Date().toISOString()
    const staleThreshold = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const expiredThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Hard-delete jobs older than 30 days
    const { error: deleteError } = await supabase
      .from("jobs")
      .delete()
      .lt("expires_at", expiredThreshold)

    if (deleteError) console.error("Hard-delete error:", deleteError.message)

    // Soft-expire jobs older than 14 days (mark inactive so UI hides them)
    const { error: softExpireError } = await supabase
      .from("jobs")
      .update({ is_active: false })
      .lt("posted_at", staleThreshold)
      .eq("is_active", true)

    if (softExpireError) console.error("Soft-expire error:", softExpireError.message)

    // Deduplicate by content hash — remove lower-quality duplicate listings
    // Find jobs with duplicate content_hash, keep the one with the most data
    const { data: dupes } = await supabase
      .rpc("delete_duplicate_jobs")
      .select()
      .maybeSingle()
    // Note: delete_duplicate_jobs is an optional Supabase function — skip if not deployed

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nexjob-sigma.vercel.app"
    const queries = getHourlyQueries()
    const country = getTodayCountry()
    let totalFetched = 0

    // Run all queries in parallel — major speedup vs sequential loop
    const fetchResults = await Promise.allSettled(
      queries.map(async (query) => {
        const res = await fetch(
          `${baseUrl}/api/jobs/fetch?query=${encodeURIComponent(query)}&country=${country}`,
          {
            headers: { "x-cron-source": "internal" },
            cache: "no-store",
          }
        )
        const data = await res.json()
        return { query, ...data }
      })
    )

    const results = fetchResults.map((r) => {
      if (r.status === "fulfilled") {
        if (r.value.success) {
          totalFetched += r.value.saved || 0
          return { query: r.value.query, count: r.value.saved, sources: r.value.sources }
        }
        return { query: r.value.query, error: r.value.error || "fetch failed" }
      }
      return { query: "unknown", error: String(r.reason) }
    })

    return NextResponse.json({
      success: true,
      hour: new Date().getUTCHours(),
      country_focus: country,
      queries_run: queries,
      total_fetched: totalFetched,
      results,
      message: `Cron: fetched ${totalFetched} jobs for ${queries.length} queries in parallel (country: ${country})`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
