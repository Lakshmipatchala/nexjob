import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.replace("Bearer ", "")
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Get user profile
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    if (!profile?.skills && !profile?.current_title) {
      return NextResponse.json({ error: "Please complete your profile first to get recommendations" })
    }

    // Get recent active jobs
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id, title, company, location, work_mode, source_url, description")
      .eq("is_active", true)
      .order("posted_at", { ascending: false })
      .limit(50)

    if (!jobs?.length) return NextResponse.json({ recommendations: [] })

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `Based on this user profile, recommend the TOP 6 most relevant jobs from the list below.

User Profile:
- Current title: ${profile.current_title || "Not specified"}
- Skills: ${profile.skills || "Not specified"}
- Experience: ${profile.experience_years || "Not specified"} years
- Desired role: ${profile.desired_role || "Not specified"}
- Preferred work mode: ${profile.preferred_work_mode || "Any"}

Available Jobs (id | title | company | work_mode):
${jobs.map(j => `${j.id} | ${j.title} | ${j.company} | ${j.work_mode}`).join("\n")}

Return ONLY a JSON array of 6 job IDs in order of best match, with a brief reason:
[
  {"id": "job-uuid-here", "reason": "Matches your React skills and senior level"},
  ...
]`
      }]
    })

    const content = message.content[0]
    if (content.type !== "text") throw new Error("Invalid response")
    const clean = content.text.replace(/```json|```/g, "").trim()
    const recommendations = JSON.parse(clean)

    // Get full job details for recommended jobs
    const recIds = recommendations.map((r: any) => r.id)
    const recJobs = jobs.filter(j => recIds.includes(j.id)).map(j => ({
      ...j,
      reason: recommendations.find((r: any) => r.id === j.id)?.reason
    }))

    return NextResponse.json({ recommendations: recJobs })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}