import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(request: Request) {
  try {
    const { jobs } = await request.json()
    if (!jobs?.length) return NextResponse.json({ scores: {} })
    const jobList = jobs.slice(0, 20).map((j: any) =>
      `id=${j.id} title="${j.title}" company="${j.company}" mode="${j.work_mode}"`
    ).join("\n")
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `Score how well each job matches a senior tech professional. Score 0-100.
Jobs:
${jobList}
Return ONLY a JSON object like: {"jobid1": 85, "jobid2": 42}
No explanation, just JSON.`
      }]
    })
    const content = message.content[0]
    if (content.type !== "text") throw new Error("Invalid response")
    const text = content.text.replace(/```json|```/g, "").trim()
    const scores = JSON.parse(text)
    return NextResponse.json({ success: true, scores })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}