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

    const allJobs: any[] = []

    // Source 1 — JSearch RapidAPI (LinkedIn, Indeed, Glassdoor, Dice)
    try {
      const res = await fetch(
        `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=5&country=us&date_posted=week`,
        { headers: { "x-rapidapi-host": "jsearch.p.rapidapi.com", "x-rapidapi-key": process.env.RAPIDAPI_KEY! } }
      )
      const data = await res.json()
      for (const job of (data.data || [])) {
        allJobs.push({
          title: job.job_title,
          company: job.employer_name,
          company_logo: job.employer_logo,
          location: job.job_city ? `${job.job_city}, ${job.job_state || job.job_country}` : "Remote",
          work_mode: job.job_is_remote ? "remote" : "onsite",
          job_type: job.job_employment_type?.toLowerCase().includes("full") ? "full_time" : "contract",
          salary_min: job.job_min_salary || null,
          salary_max: job.job_max_salary || null,
          source: job.job_publisher?.toLowerCase().includes("linkedin") ? "linkedin"
            : job.job_publisher?.toLowerCase().includes("indeed") ? "indeed"
            : job.job_publisher?.toLowerCase().includes("glassdoor") ? "glassdoor"
            : job.job_publisher?.toLowerCase().includes("dice") ? "dice"
            : "other",
          source_url: job.job_apply_link,
          description: job.job_description?.slice(0, 5000) || "",
          external_id: `jsearch_${job.job_id}`,
          posted_at: job.job_posted_at_datetime_utc || new Date().toISOString(),
          is_active: true,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
      console.log(`JSearch: ${allJobs.length} jobs`)
    } catch (e) { console.error("JSearch error:", e) }

    // Source 2 — Remotive (free, unlimited remote jobs)
    try {
      const keywords = query.split(" ").slice(0, 2).join("-")
      const res = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=100`)
      const data = await res.json()
      for (const job of (data.jobs || [])) {
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
          description: job.description?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000) || "",
          external_id: `remotive_${job.id}`,
          posted_at: job.publication_date || new Date().toISOString(),
          is_active: true,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
      console.log(`Remotive: ${allJobs.length} total`)
    } catch (e) { console.error("Remotive error:", e) }

    // Source 3 — Arbeitnow (free, unlimited tech jobs)
    try {
      const res = await fetch(`https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(query)}`)
      const data = await res.json()
      for (const job of (data.data || [])) {
        allJobs.push({
          title: job.title,
          company: job.company_name,
          company_logo: null,
          location: job.location || "Remote",
          work_mode: job.remote ? "remote" : "onsite",
          job_type: "full_time",
          salary_min: null,
          salary_max: null,
          source: "arbeitnow",
          source_url: job.url,
          description: job.description?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000) || "",
          external_id: `arbeitnow_${job.slug}`,
          posted_at: job.created_at ? new Date(job.created_at * 1000).toISOString() : new Date().toISOString(),
          is_active: true,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
      console.log(`Arbeitnow: ${allJobs.length} total`)
    } catch (e) { console.error("Arbeitnow error:", e) }

    // Source 4 — The Muse (free, unlimited)
    try {
      const res = await fetch(`https://www.themuse.com/api/public/jobs?descending=true&page=1&level=Senior+Level&level=Mid+Level`)
      const data = await res.json()
      const keyword = query.toLowerCase()
      for (const job of (data.results || []).filter((j: any) =>
        j.name?.toLowerCase().includes(keyword) ||
        j.categories?.some((c: any) => c.name?.toLowerCase().includes(keyword))
      )) {
        allJobs.push({
          title: job.name,
          company: job.company?.name || "Unknown",
          company_logo: job.company?.refs?.landing_page || null,
          location: job.locations?.[0]?.name || "Remote",
          work_mode: job.locations?.[0]?.name?.toLowerCase().includes("remote") ? "remote" : "onsite",
          job_type: "full_time",
          salary_min: null,
          salary_max: null,
          source: "themuse",
          source_url: job.refs?.landing_page || "",
          description: job.contents?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000) || "",
          external_id: `themuse_${job.id}`,
          posted_at: job.publication_date || new Date().toISOString(),
          is_active: true,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
      console.log(`TheMuse: ${allJobs.length} total`)
    } catch (e) { console.error("TheMuse error:", e) }

    // Source 5 — Jobicy (free remote jobs)
    try {
      const res = await fetch(`https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(query.split(" ")[0])}`)
      const data = await res.json()
      for (const job of (data.jobs || [])) {
        allJobs.push({
          title: job.jobTitle,
          company: job.companyName,
          company_logo: job.companyLogo || null,
          location: job.jobGeo || "Remote",
          work_mode: "remote",
          job_type: job.jobType?.includes("full") ? "full_time" : "contract",
          salary_min: null,
          salary_max: null,
          source: "jobicy",
          source_url: job.url,
          description: job.jobExcerpt?.slice(0, 5000) || "",
          external_id: `jobicy_${job.id}`,
          posted_at: job.pubDate || new Date().toISOString(),
          is_active: true,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
      console.log(`Jobicy: ${allJobs.length} total`)
    } catch (e) { console.error("Jobicy error:", e) }

    // Source 6 — Adzuna (free tier)
    if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
      try {
        for (let page = 1; page <= 3; page++) {
          const res = await fetch(
            `https://api.adzuna.com/v1/api/jobs/us/search/${page}?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&what=${encodeURIComponent(query)}&results_per_page=50&max_days_old=7`
          )
          const data = await res.json()
          const jobs = data.results || []
          if (jobs.length === 0) break
          for (const job of jobs) {
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
              description: job.description?.slice(0, 5000) || "",
              external_id: `adzuna_${job.id}`,
              posted_at: job.created || new Date().toISOString(),
              is_active: true,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            })
          }
        }
        console.log(`Adzuna: ${allJobs.length} total`)
      } catch (e) { console.error("Adzuna error:", e) }
    }

    // Source 7 — USAJobs (free, unlimited government jobs)
    try {
      const res = await fetch(
        `https://data.usajobs.gov/api/search?Keyword=${encodeURIComponent(query)}&ResultsPerPage=50&DatePosted=7`,
        { headers: { "Host": "data.usajobs.gov", "User-Agent": "nexjob-app", "Authorization-Key": "" } }
      )
      const data = await res.json()
      for (const item of (data.SearchResult?.SearchResultItems || [])) {
        const job = item.MatchedObjectDescriptor
        allJobs.push({
          title: job.PositionTitle,
          company: job.OrganizationName,
          company_logo: null,
          location: job.PositionLocationDisplay || "US",
          work_mode: "onsite",
          job_type: "full_time",
          salary_min: parseFloat(job.PositionRemuneration?.[0]?.MinimumRange) || null,
          salary_max: parseFloat(job.PositionRemuneration?.[0]?.MaximumRange) || null,
          source: "usajobs",
          source_url: job.PositionURI,
          description: job.UserArea?.Details?.JobSummary?.slice(0, 5000) || "",
          external_id: `usajobs_${job.PositionID}`,
          posted_at: job.PublicationStartDate || new Date().toISOString(),
          is_active: true,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
      console.log(`USAJobs: ${allJobs.length} total`)
    } catch (e) { console.error("USAJobs error:", e) }

    // Remove duplicates
    const seen = new Set()
    const unique = allJobs.filter(j => {
      if (!j.external_id || seen.has(j.external_id)) return false
      seen.add(j.external_id)
      return true
    })

    // Save in batches
    let saved = 0
    for (let i = 0; i < unique.length; i += 50) {
      const batch = unique.slice(i, i + 50)
      const { error } = await supabase
        .from("jobs")
        .upsert(batch, { onConflict: "external_id", ignoreDuplicates: false })
      if (!error) saved += batch.length
      else console.error("batch error:", error.message)
    }

    return NextResponse.json({
      success: true,
      count: saved,
      sources: "JSearch + Remotive + Arbeitnow + TheMuse + Jobicy + Adzuna + USAJobs",
      message: `✓ Fetched ${saved} jobs from 7 free sources!`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}