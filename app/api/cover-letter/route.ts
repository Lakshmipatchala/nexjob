import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(request: Request) {
  try {
    const { jobTitle, company, jobDescription, resumeText, tone, length } = await request.json()
    const wordCount = length === "short" ? "180-220" : length === "long" ? "450-520" : "300-380"
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `Write a tailored cover letter for this job application.
Job Title: ${jobTitle}
Company: ${company || "the company"}
Tone: ${tone}
Target word count: ${wordCount} words
Job Description: ${jobDescription}
Applicant Background: ${resumeText}
REQUIREMENTS:
- Address it to "Hiring Manager"
- Opening: strong hook connecting experience to the role
- Middle: highlight 2-3 specific achievements matching the JD
- Closing: confident call to action
- Tone must be ${tone}
- Do NOT use "I am writing to apply"
- Return ONLY the letter text`
      }]
    })
    const content = message.content[0]
    if (content.type !== "text") throw new Error("Invalid response")
    return NextResponse.json({ success: true, coverLetter: content.text.trim() })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}