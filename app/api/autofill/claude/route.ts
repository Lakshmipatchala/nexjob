import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@supabase/supabase-js"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const token = authHeader.replace("Bearer ", "")
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const { fieldLabel, jobContext } = await request.json()

    // Get user profile for context
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `You are filling out a job application form field.

Field label: "${fieldLabel}"
Job/Company context: ${jobContext}
Applicant name: ${profile?.first_name} ${profile?.last_name}
Applicant background: ${profile?.resume_json ? JSON.stringify(profile.resume_json).slice(0, 500) : "Experienced professional"}

Write a concise, professional answer for this specific field. 2-4 sentences maximum. No preamble.`
      }]
    })

    const answer = message.content[0].type === "text" ? message.content[0].text : ""
    return NextResponse.json({ answer })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}