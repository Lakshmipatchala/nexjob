import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const ALL_QUERIES = [
  "software engineer", "software developer", "software architect",
  "senior software engineer", "staff software engineer", "principal software engineer",
  "data engineer", "senior data engineer", "data platform engineer",
  "ETL developer", "data warehouse engineer", "databricks engineer",
  "snowflake developer", "dbt developer", "spark engineer",
  "kafka engineer", "data pipeline engineer", "analytics engineer",
  "AI engineer", "artificial intelligence engineer", "machine learning engineer",
  "ML ops engineer", "deep learning engineer", "NLP engineer",
  "computer vision engineer", "LLM engineer", "generative AI engineer",
  "AI researcher", "data scientist", "senior data scientist",
  "applied scientist", "research scientist", "frontend developer",
  "frontend engineer", "react developer", "angular developer",
  "vue developer", "nextjs developer", "typescript developer",
  "javascript developer", "UI developer", "web developer",
  "backend developer", "backend engineer", "python developer",
  "java developer", "golang developer", "nodejs developer",
  "ruby on rails developer", "scala developer", "C++ developer",
  "rust developer", "php developer", "full stack developer",
  "full stack engineer", "MERN stack developer", "devops engineer",
  "site reliability engineer", "platform engineer", "infrastructure engineer",
  "cloud engineer", "AWS engineer", "azure engineer", "GCP engineer",
  "kubernetes engineer", "docker engineer", "terraform engineer",
  "CI CD engineer", "QA engineer", "QA automation engineer",
  "test engineer", "SDET engineer", "automation engineer",
  "performance test engineer", "mobile developer", "iOS developer",
  "android developer", "react native developer", "flutter developer",
  "cybersecurity engineer", "security engineer", "penetration tester",
  "cloud security engineer", "database administrator", "database engineer",
  "postgresql developer", "mongodb developer", "solutions architect",
  "cloud architect", "enterprise architect", "engineering manager",
  "technical lead", "product manager technology", "technical program manager",
  "scrum master", "business analyst IT", "data analyst",
  "business intelligence developer", "BI engineer", "tableau developer",
  "power BI developer", "blockchain developer", "web3 developer",
  "game developer", "unity developer", "embedded systems engineer",
  "firmware engineer", "robotics engineer", "AR VR developer",
  "SAP developer", "salesforce developer", "ServiceNow developer"
]

function getHourlyQueries(): string[] {
  const hour = new Date().getHours()
  const start = (hour * 15) % ALL_QUERIES.length
  const queries: string[] = []
  for (let i = 0; i < 15; i++) {
    queries.push(ALL_QUERIES[(start + i) % ALL_QUERIES.length])
  }
  return queries
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

    await supabase
      .from("jobs")
      .delete()
      .lt("posted_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    const baseUrl = "https://nexjob-sigma.vercel.app"
    const queries = getHourlyQueries()
    let totalFetched = 0
    const results: any[] = []

    for (const query of queries) {
      try {
        const res = await fetch(`${baseUrl}/api/jobs/fetch?query=${encodeURIComponent(query)}`)
        const data = await res.json()
        if (data.success) {
          totalFetched += data.count || 0
          results.push({ query, count: data.count })
        }
      } catch (e) { results.push({ query, error: String(e) }) }
    }

    return NextResponse.json({
      success: true,
      hour: new Date().getHours(),
      queries_run: queries,
      fetched: totalFetched,
      results,
      message: `Hourly cron: fetched ${totalFetched} jobs for ${queries.length} categories`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}