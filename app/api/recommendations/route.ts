import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

export async function POST(request: Request) {
  try {
    const { userId, profile } = await request.json()
    if (!profile) return NextResponse.json({ error: "No profile provided" }, { status: 400 })

    // Get jobs from last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: jobs, error } = await supabase
      .from("jobs")
      .select("*")
      .gte("posted_at", sevenDaysAgo)
      .order("posted_at", { ascending: false })
      .limit(200)

    if (error) throw error
    if (!jobs?.length) return NextResponse.json({ jobs: [] })

    // Get applied job IDs to exclude
    const { data: applied } = await supabase
      .from("applications")
      .select("job_id")
      .eq("user_id", userId)
    const appliedIds = new Set((applied || []).map((a: any) => a.job_id))

    const availableJobs = jobs.filter(j => !appliedIds.has(j.id))

    // Build profile summary for AI
    const profileSummary = `
Name: ${profile.first_name} ${profile.last_name}
Desired Title: ${profile.desired_title || "Not specified"}
Years Experience: ${profile.years_experience || "Not specified"}
Desired Location: ${profile.desired_location || "Any"}
Target Salary: ${profile.target_salary || "Not specified"}
Work Authorization: ${profile.work_authorization || "Not specified"}
Resume Summary: ${profile.resume_summary || "Not provided"}
    `.trim()

    // Use Claude to score and rank jobs
    const jobList = availableJobs.slice(0, 100).map((j, i) =>
      `${i}|${j.id}|${j.title}|${j.company}|${j.location}|${j.work_mode}|${j.salary_min || 0}`
    ).join("\n")

    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `You are a job matching AI. Score these jobs for this candidate and return top 20 matches.

CANDIDATE PROFILE:
${profileSummary}

JOBS (format: index|id|title|company|location|work_mode|salary_min):
${jobList}

Return ONLY a JSON array of top 20 matches, ordered by match score descending:
[
  {
    "index": 0,
    "score": 92,
    "reasons": ["matches desired title", "senior level role", "remote work"]
  }
]

Score based on: title match, experience level, location/remote preference, salary match, work mode.
Return ONLY the JSON array, no other text.`
      }]
    })

    const content = msg.content[0]
    if (content.type !== "text") throw new Error("Invalid AI response")

    let matches: any[] = []
    try {
      const text = content.text.replace(/```json|```/g, "").trim()
      matches = JSON.parse(text)
    } catch (e) {
      return NextResponse.json({ jobs: [] })
    }

    // Build final job list with scores
    const recommendedJobs = matches
      .filter(m => m.index < availableJobs.length)
      .map(m => ({
        ...availableJobs[m.index],
        match_score: m.score,
        match_reasons: m.reasons || []
      }))
      .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))

    return NextResponse.json({ jobs: recommendedJobs })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}