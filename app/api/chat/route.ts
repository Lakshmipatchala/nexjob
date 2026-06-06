import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@supabase/supabase-js"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(request: Request) {
  try {
    const { messages, userId } = await request.json()

    // Get user profile for context
    let profileContext = ""
    if (userId) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SECRET_KEY!
      )
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()

      if (profile) {
        profileContext = `
User Profile:
- Name: ${profile.first_name} ${profile.last_name}
- Desired Title: ${profile.desired_title || "Not set"}
- Years Experience: ${profile.years_experience || "Not set"}
- Desired Location: ${profile.desired_location || "Not set"}
- Target Salary: ${profile.target_salary || "Not set"}
- Work Authorization: ${profile.work_authorization || "Not set"}
- Resume Summary: ${profile.resume_summary || "Not provided"}
        `.trim()
      }
    }

    const systemPrompt = `You are an expert AI career coach and job search assistant for NexJob, an AI-powered job portal.

${profileContext ? `Here is the user's profile:\n${profileContext}\n` : ""}

You help users with:
- Job search strategy and tips
- Resume writing and optimization
- Cover letter advice
- Interview preparation and practice
- Salary negotiation tactics
- Career growth advice
- Skills gap analysis
- LinkedIn profile optimization
- Networking strategies
- Work visa and authorization questions
- Specific job application advice

Be friendly, encouraging, specific and actionable. When giving advice, always tailor it to the user's profile if available.
Keep responses concise but helpful. Use bullet points and structure when listing multiple items.
You have deep knowledge of the tech industry, software engineering, data engineering, AI/ML, and other IT roles.`

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content
      }))
    })

    const content = response.content[0]
    if (content.type !== "text") throw new Error("Invalid response")

    return NextResponse.json({ 
      success: true, 
      message: content.text,
      usage: response.usage
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}