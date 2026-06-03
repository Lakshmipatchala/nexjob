import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const resumeText = formData.get("resumeText") as string
    const jobDescription = formData.get("jobDescription") as string
    const jobTitle = formData.get("jobTitle") as string
    const company = formData.get("company") as string
    const pages = formData.get("pages") as string || "1"
    const style = formData.get("style") as string || "professional"
    const experienceLevel = formData.get("experienceLevel") as string || "senior"
    const sections = formData.get("sections") as string || "summary,experience,education,skills"
    const bulletsPerJob = formData.get("bulletsPerJob") as string || "3"

    const summaryLength = Number(pages) <= 1 ? "2 sentences" : Number(pages) <= 2 ? "3 sentences" : "4-5 sentences"

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8096,
      messages: [{
        role: "user",
        content: `You are an expert ATS resume writer. Rewrite the ENTIRE resume tailored to the job.

STRICT SPECIFICATIONS:
- Pages: ${pages} page(s) — scale content length accordingly
- Style: ${style}
- Experience Level: ${experienceLevel}
- Include sections: ${sections}
- Summary length: ${summaryLength}
- Bullets per job: EXACTLY ${bulletsPerJob} bullet points per job role
- 1 page: very concise, most recent 2 jobs only
- 2 pages: last 3-4 jobs, full bullets
- 3 pages: all jobs, full bullets, add projects/certs
- 4-6 pages: comprehensive, include all roles, detailed bullets, publications, awards, volunteer work if available

Job Title: ${jobTitle}
Company: ${company}
Job Description:
${jobDescription}

Original Resume:
${resumeText}

CRITICAL: Return ONLY a valid complete JSON object. No text before or after. No markdown. No truncation.
{
  "ats_score_before": 45,
  "ats_score_after": 88,
  "keywords_added": ["kw1", "kw2", "kw3", "kw4", "kw5"],
  "full_resume": {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "555-000-0000",
    "linkedin": "linkedin.com/in/username",
    "location": "City, State",
    "summary": "Tailored summary",
    "experience": [
      {
        "title": "Job Title",
        "company": "Company",
        "duration": "Jan 2022 - Present",
        "bullets": ["bullet 1", "bullet 2", "bullet 3"]
      }
    ],
    "education": [{ "degree": "BS Computer Science", "school": "University", "year": "2018" }],
    "skills": ["skill1", "skill2", "skill3"],
    "certifications": ["Certification Name — Issuer (Year)", "Another Cert — Issuer (Year)"],
    "projects": [{ "name": "Project", "description": "Description" }],
    "awards": ["award1", "award2"],
    "volunteer": [{ "role": "Role", "org": "Organization", "description": "What you did" }]
  },
  "cover_letter": "Cover letter paragraph"
}`
      }]
    })

    const content = message.content[0]
    if (content.type !== "text") throw new Error("Invalid response")

    let text = content.text.replace(/```json|```/g, "").trim()

    // Fix truncated JSON by finding last complete structure
    const firstBrace = text.indexOf("{")
    const lastBrace = text.lastIndexOf("}")
    if (firstBrace !== -1 && lastBrace !== -1) {
      text = text.slice(firstBrace, lastBrace + 1)
    }

    let result
    try {
      result = JSON.parse(text)
    } catch {
      // Try to fix common JSON issues
      text = text
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/[\x00-\x1F\x7F]/g, " ")
      result = JSON.parse(text)
    }

    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}