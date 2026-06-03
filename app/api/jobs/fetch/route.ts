import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query") || "software engineer"

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    // Mark jobs as inactive if past expiry date — do NOT delete them
    await supabase
      .from("jobs")
      .update({ is_active: false })
      .lt("expires_at", new Date().toISOString())
      .eq("is_active", true)

    // Fetch fresh jobs from JSearch
    const res = await fetch(
      `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=3&country=us&date_posted=today`,
      {
        headers: {
          "x-rapidapi-host": "jsearch.p.rapidapi.com",
          "x-rapidapi-key": process.env.RAPIDAPI_KEY!,
        },
      }
    )

    const data = await res.json()
    const jobs = data.data || []

    const mapped = jobs.map((job: any) => ({
      title: job.job_title,
      company: job.employer_name,
      company_logo: job.employer_logo,
      location: job.job_city
        ? `${job.job_city}, ${job.job_state || job.job_country}`
        : job.job_country || "Remote",
      work_mode: job.job_is_remote ? "remote" : "onsite",
      job_type: job.job_employment_type?.toLowerCase().includes("full")
        ? "full_time" : "contract",
      salary_min: job.job_min_salary || null,
      salary_max: job.job_max_salary || null,
      source: job.job_publisher?.toLowerCase().includes("linkedin") ? "linkedin"
        : job.job_publisher?.toLowerCase().includes("indeed") ? "indeed"
        : job.job_publisher?.toLowerCase().includes("glassdoor") ? "glassdoor"
        : "other",
      source_url: job.job_apply_link,
      description: job.job_description?.slice(0, 500) || "",
      external_id: job.job_id,
      posted_at: job.job_posted_at_datetime_utc || new Date().toISOString(),
      is_active: true,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }))

    const { error } = await supabase
      .from("jobs")
      .upsert(mapped, { onConflict: "external_id", ignoreDuplicates: true })

    if (error) throw error

    return NextResponse.json({
      success: true,
      count: mapped.length,
      query,
      message: `Fetched ${mapped.length} active jobs`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}