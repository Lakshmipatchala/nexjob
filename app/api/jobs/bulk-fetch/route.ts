import { NextResponse } from "next/server"

const ALL_QUERIES = [
  "software engineer", "data engineer", "AI engineer",
  "machine learning engineer", "data scientist", "frontend developer",
  "backend developer", "full stack developer", "devops engineer",
  "cloud engineer", "QA automation engineer", "test engineer",
  "python developer", "react developer", "nodejs developer",
  "AWS engineer", "cybersecurity engineer", "data analyst",
  "product manager", "mobile developer", "AI researcher",
  "LLM engineer", "generative AI engineer", "deep learning engineer",
  "NLP engineer", "computer vision engineer", "ML ops engineer",
  "data warehouse engineer", "databricks engineer", "snowflake developer",
  "dbt developer", "spark engineer", "kafka engineer",
  "analytics engineer", "ETL developer", "java developer",
  "golang developer", "scala developer", "C++ developer",
  "rust developer", "typescript developer", "angular developer",
  "vue developer", "kubernetes engineer", "docker engineer",
  "terraform engineer", "site reliability engineer", "platform engineer",
  "iOS developer", "android developer", "react native developer",
  "flutter developer", "security engineer", "penetration tester",
  "database administrator", "solutions architect", "cloud architect",
  "engineering manager", "technical lead", "scrum master",
  "business intelligence developer", "tableau developer", "power BI developer",
  "blockchain developer", "web3 developer", "game developer",
  "embedded systems engineer", "robotics engineer", "SAP developer",
  "salesforce developer", "staff engineer", "principal engineer"
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "0")
    const batchSize = 3 // Only 3 queries per call to avoid timeout
    const baseUrl = new URL(request.url).origin

    const batch = ALL_QUERIES.slice(page * batchSize, (page + 1) * batchSize)
    if (batch.length === 0) {
      return NextResponse.json({
        success: true,
        done: true,
        message: "All categories fetched!"
      })
    }

    let totalFetched = 0
    for (const query of batch) {
      try {
        const res = await fetch(`${baseUrl}/api/jobs/fetch?query=${encodeURIComponent(query)}`)
        const data = await res.json()
        if (data.success) totalFetched += data.count || 0
      } catch (e) { console.error(`Failed: ${query}`, e) }
    }

    const nextPage = page + 1
    const hasMore = nextPage * batchSize < ALL_QUERIES.length
    const progress = Math.min(100, Math.round(((page + 1) * batchSize / ALL_QUERIES.length) * 100))

    return NextResponse.json({
      success: true,
      done: !hasMore,
      nextPage: hasMore ? nextPage : null,
      fetched: totalFetched,
      progress,
      current: batch,
      total_categories: ALL_QUERIES.length,
      message: `${progress}% complete — fetched ${totalFetched} jobs (${batch.join(", ")})`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}