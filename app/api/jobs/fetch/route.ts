import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

async function cleanJobDescription(rawDesc: string, title: string): Promise<string> {
  if (!rawDesc || rawDesc.length < 100) return rawDesc
  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [{
        role: "user",
        content: `Clean this job description for "${title}". 
REMOVE: recruiter names, agency names, email addresses, phone numbers, physical addresses, "apply now", "about us" company marketing, equal opportunity boilerplate, salary ranges, benefits lists.
KEEP: required qualifications, required skills, responsibilities, what they are looking for, tech stack, experience requirements.
Return only the cleaned text, no headers, no bullet formatting changes.

Job Description:
${rawDesc.slice(0, 3000)}`
      }]
    })
    const content = msg.content[0]
    return content.type === "text" ? content.text.trim() : rawDesc.slice(0, 2000)
  } catch {
    return rawDesc.slice(0, 2000)
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query") || "software engineer"

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    const allJobs: any[] = []

    // Source 1 — JSearch (LinkedIn, Indeed, Glassdoor)
    try {
      const res = await fetch(
        `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=5&country=us&date_posted=week`,
        {
          headers: {
            "x-rapidapi-host": "jsearch.p.rapidapi.com",
            "x-rapidapi-key": process.env.RAPIDAPI_KEY!,
          },
        }
      )
      const data = await res.json()
      const jobs = data.data || []
      jobs.forEach((job: any) => {
        allJobs.push({
          title: job.job_title,
          company: job.employer_name,
          company_logo: job.employer_logo,
          location: job.job_city ? `${job.job_city}, ${job.job_state || job.job_country}` : job.job_country || "Remote",
          work_mode: job.job_is_remote ? "remote" : "onsite",
          job_type: job.job_employment_type?.toLowerCase().includes("full") ? "full_time" : "contract",
          salary_min: job.job_min_salary || null,
          salary_max: job.job_max_salary || null,
          source: job.job_publisher?.toLowerCase().includes("linkedin") ? "linkedin"
            : job.job_publisher?.toLowerCase().includes("indeed") ? "indeed"
            : job.job_publisher?.toLowerCase().includes("glassdoor") ? "glassdoor"
            : job.job_publisher?.toLowerCase().includes("dice") ? "dice"
            : job.job_publisher?.toLowerCase().includes("ziprecruiter") ? "ziprecruiter"
            : "other",
          source_url: job.job_apply_link,
          raw_description: job.job_description || "",
          external_id: `jsearch_${job.job_id}`,
          posted_at: job.job_posted_at_datetime_utc || new Date().toISOString(),
          is_active: true,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
      })
    } catch (e) { console.error("JSearch error:", e) }

    // Source 2 — Remotive (free remote jobs API)
    try {
      const remotiveQuery = query.replace(/\s+/g, "+")
      const res = await fetch(`https://remotive.com/api/remote-jobs?search=${remotiveQuery}&limit=20`)
      const data = await res.json()
      const jobs = data.jobs || []
      jobs.forEach((job: any) => {
        allJobs.push({
          title: job.title,
          company: job.company_name,
          company_logo: job.company_logo,
          location: job.candidate_required_location || "Remote",
          work_mode: "remote",
          job_type: "full_time",
          salary_min: null,
          salary_max: null,
          source: "remotive",
          source_url: job.url,
          raw_description: job.description?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "",
          external_id: `remotive_${job.id}`,
          posted_at: job.publication_date || new Date().toISOString(),
          is_active: true,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
      })
    } catch (e) { console.error("Remotive error:", e) }

    // Source 3 — Adzuna
    if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
      try {
        const res = await fetch(
          `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&what=${encodeURIComponent(query)}&results_per_page=20&max_days_old=7`
        )
        const data = await res.json()
        const jobs = data.results || []
        jobs.forEach((job: any) => {
          allJobs.push({
            title: job.title,
            company: job.company?.display_name || "Unknown",
            company_logo: null,
            location: job.location?.display_name || "US",
            work_mode: job.title?.toLowerCase().includes("remote") ? "remote" : "onsite",
            job_type: job.contract_time === "full_time" ? "full_time" : "contract",
            salary_min: job.salary_min || null,
            salary_max: job.salary_max || null,
            source: "adzuna",
            source_url: job.redirect_url,
            raw_description: job.description || "",
            external_id: `adzuna_${job.id}`,
            posted_at: job.created || new Date().toISOString(),
            is_active: true,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          })
        })
      } catch (e) { console.error("Adzuna error:", e) }
    }

    // Clean descriptions with AI and save
    const mapped = []
    for (const job of allJobs.slice(0, 50)) {
      const cleanedDesc = await cleanJobDescription(job.raw_description, job.title)
      mapped.push({
        ...job,
        description: cleanedDesc,

      })
    }

    if (mapped.length > 0) {
      const { error } = await supabase
        .from("jobs")
        .upsert(mapped, { onConflict: "external_id", ignoreDuplicates: false })
      if (error) throw error
    }

    return NextResponse.json({
      success: true,
      count: mapped.length,
      query,
      message: `Fetched ${mapped.length} jobs from multiple sources`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}