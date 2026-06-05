import { NextResponse } from "next/server"

const JOB_QUERIES = [
  "software engineer",
  "data engineer",
  "frontend developer",
  "backend developer",
  "full stack developer",
  "python developer",
  "react developer",
  "devops engineer",
  "cloud engineer",
  "machine learning engineer",
  "data scientist",
  "product manager",
  "UX designer",
  "QA engineer",
  "java developer",
  "nodejs developer",
  "AWS engineer",
  "data analyst",
  "cybersecurity engineer",
  "mobile developer",
  "AI engineer",
  "artificial intelligence engineer",
  "ML engineer",
  "deep learning engineer",
  "NLP engineer",
  "computer vision engineer",
  "AI researcher",
  "LLM engineer",
  "generative AI engineer",
  "test engineer",
  "automation test engineer",
  "SDET engineer",
  "QA automation engineer",
  "software test engineer",
  "performance test engineer",
  "security engineer",
  "site reliability engineer",
  "platform engineer",
  "infrastructure engineer",
  "kubernetes engineer",
  "docker engineer",
  "azure engineer",
  "GCP engineer",
  "data platform engineer",
  "analytics engineer",
  "business intelligence engineer",
  "ETL developer",
  "spark engineer",
  "hadoop engineer",
  "databricks engineer",
  "snowflake developer",
  "dbt developer",
  "data warehouse engineer",
  "golang developer",
  "rust developer",
  "scala developer",
  "C++ developer",
  "embedded systems engineer",
  "iOS developer",
  "android developer",
  "react native developer",
  "flutter developer",
  "angular developer",
  "vue developer",
  "typescript developer",
  "database administrator",
  "postgresql developer",
  "mongodb developer",
  "redis engineer",
  "elasticsearch engineer",
  "API developer",
  "microservices engineer",
  "blockchain developer",
  "web3 developer",
  "game developer",
  "AR VR developer",
  "robotics engineer",
  "solutions architect",
  "technical lead",
  "engineering manager",
  "scrum master",
  "agile coach",
  "technical program manager",
  "staff engineer",
  "principal engineer"
]

export async function GET(request: Request) {
  try {
    const baseUrl = new URL(request.url).origin
    let totalFetched = 0
    const results: any[] = []

    for (const query of JOB_QUERIES) {
      try {
        const res = await fetch(`${baseUrl}/api/jobs/fetch?query=${encodeURIComponent(query)}`)
        const data = await res.json()
        if (data.success) {
          totalFetched += data.count || 0
          results.push({ query, count: data.count })
        } else {
          results.push({ query, error: data.error })
        }
      } catch (e) {
        results.push({ query, error: String(e) })
      }
    }

    return NextResponse.json({
      success: true,
      total: totalFetched,
      categories: JOB_QUERIES.length,
      results,
      message: `✓ Bulk fetched ${totalFetched} jobs across ${JOB_QUERIES.length} job categories!`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}