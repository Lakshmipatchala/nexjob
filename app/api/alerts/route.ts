import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  try {
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return NextResponse.json({ error: "Email service not configured yet" }, { status: 503 })
    }

    const { Resend } = await import("resend")
    const resend = new Resend(resendKey)

    const { email, query } = await request.json()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: jobs } = await supabase
      .from("jobs")
      .select("*")
      .eq("is_active", true)
      .gte("posted_at", yesterday)
      .ilike("title", `%${query}%`)
      .limit(10)

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: "No new jobs found for this query" })
    }

    const jobListHtml = jobs.map(job => `
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px;">
        <h3 style="margin:0 0 4px;color:#1f2937;font-size:16px;">${job.title}</h3>
        <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">${job.company} · ${job.location}</p>
        <a href="${job.source_url}" style="background:#7c3aed;color:white;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">Apply Now</a>
      </div>
    `).join("")

    await resend.emails.send({
      from: "NexJob Alerts <onboarding@resend.dev>",
      to: email,
      subject: `🔔 ${jobs.length} new "${query}" jobs today`,
      html: `
        <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
          <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="color:white;margin:0;font-size:24px;">NexJob</h1>
            <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;">Daily Job Alert</p>
          </div>
          <div style="background:white;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
            <h2 style="color:#1f2937;margin:0 0 16px;">Found ${jobs.length} new "${query}" jobs today</h2>
            ${jobListHtml}
            <div style="text-align:center;margin-top:20px;padding-top:20px;border-top:1px solid #e5e7eb;">
              <a href="https://nexjob-sigma.vercel.app/dashboard/jobs" style="background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
                View All Jobs on NexJob
              </a>
            </div>
          </div>
        </div>
      `
    })

    return NextResponse.json({ success: true, jobCount: jobs.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}