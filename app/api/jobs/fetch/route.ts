import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

async function cleanJD(raw: string, title: string): Promise<string> {
  if (!raw || raw.length < 50) return raw
  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `Extract ONLY the job requirements from this description for "${title}".
REMOVE completely: addresses, phone numbers, emails, recruiter names, "apply now" text, company marketing, equal opportunity statements, benefits, salary info.
KEEP: required skills, required qualifications, responsibilities, tech stack, years of experience needed, what they are looking for.
Return clean plain text only, no markdown, no headers.

Raw description:
${raw.slice(0, 4000)}`
      }]
    })
    const content = msg.content[0]
    return content.type === "text" ? content.text.trim() : raw.slice(0, 2000)
  } catch {
    return raw.slice(0, 2000)
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

    const rawJobs: any[] = []

    // Source 1 — JSearch (LinkedIn, Indeed, Glassdoor, Dice, ZipRecruiter)
    try {
      const res = await fetch(
        `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=5&country=us&date_posted=week`,
        { headers: { "x-rapidapi-host": "jsearch.p.rapidapi.com", "x-rapidapi-key": process.env.RAPIDAPI_KEY! } }
      )
      const data = await res.json()
      for (const job of (data.data || [])) {
        rawJobs.push({
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
            : job.job_publisher?.toLowerCase().includes("zip") ? "ziprecruiter"
            : "other",
          source_url: job.job_apply_link,
          _raw: job.job_description || "",
          external_id: `jsearch_${job.job_id}`,
          posted_at: job.job_posted_at_datetime_utc || new Date().toISOString(),
          is_active: true,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
    } catch (e) { console.error("JSearch error:", e) }

    // Source 2 — Remotive (free remote jobs)
    try {
      const res = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=20`)
      const data = await res.json()
      for (const job of (data.jobs || [])) {
        rawJobs.push({
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
          _raw: job.description?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "",
          external_id: `remotive_${job.id}`,
          posted_at: job.publication_date || new Date().toISOString(),
          is_active: true,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
    } catch (e) { console.error("Remotive error:", e) }

    // Source 3 — Adzuna (if keys exist)
    if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
      try {
        const res = await fetch(
          `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&what=${encodeURIComponent(query)}&results_per_page=20&max_days_old=7`
        )
        const data = await res.json()
        for (const job of (data.results || [])) {
          rawJobs.push({
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
            _raw: job.description || "",
            external_id: `adzuna_${job.id}`,
            posted_at: job.created || new Date().toISOString(),
            is_active: true,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          })
        }
      } catch (e) { console.error("Adzuna error:", e) }
    }

    // Clean JD with AI and build final objects (no raw_description column)
    const mapped = []
    for (const job of rawJobs.slice(0, 40)) {
      const cleanedDesc = await cleanJD(job._raw, job.title)
      const { _raw, ...rest } = job
      mapped.push({ ...rest, description: cleanedDesc })
    }

    if (mapped.length > 0) {
      const { error } = await supabase
        .from("jobs")
        .upsert(mapped, { onConflict: "external_id", ignoreDuplicates: false })
      if (error) {
        console.error("upsert error:", error.message)
        throw error
      }
    }

    return NextResponse.json({
      success: true,
      count: mapped.length,
      query,
      message: `✓ Fetched ${mapped.length} jobs from LinkedIn, Indeed, Glassdoor, Remotive & more`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}