import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function isValidJob(title: string, location: string, isRemote: boolean): boolean {
  if (!title) return false
  // Block German/European job patterns
  if (title.includes("(m/w/d)") || title.includes("(m/f/d)") || title.includes("(w/m/d)")) return false
  // For onsite jobs, must be US
  if (!isRemote) {
    const loc = location.toLowerCase()
    const usPatterns = ["usa", "united states", ", al", ", ak", ", az", ", ar", ", ca", ", co", ", ct", ", de", ", fl", ", ga", ", hi", ", id", ", il", ", in", ", ia", ", ks", ", ky", ", la", ", me", ", md", ", ma", ", mi", ", mn", ", ms", ", mo", ", mt", ", ne", ", nv", ", nh", ", nj", ", nm", ", ny", ", nc", ", nd", ", oh", ", ok", ", or", ", pa", ", ri", ", sc", ", sd", ", tn", ", tx", ", ut", ", vt", ", va", ", wa", ", wv", ", wi", ", wy", "new york", "san francisco", "los angeles", "chicago", "seattle", "boston", "austin", "denver", "atlanta", "dallas", "remote"]
    return usPatterns.some(p => loc.includes(p))
  }
  return true
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

    // Source 1 — JSearch (LinkedIn, Indeed, Glassdoor, Dice) - US focused
    try {
      const res = await fetch(
        `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query + " USA")}&num_pages=5&country=us&date_posted=week`,
        { headers: { "x-rapidapi-host": "jsearch.p.rapidapi.com", "x-rapidapi-key": process.env.RAPIDAPI_KEY! } }
      )
      const data = await res.json()
      for (const job of (data.data || [])) {
        const isRemote = job.job_is_remote === true
        const location = job.job_city ? `${job.job_city}, ${job.job_state || job.job_country}` : isRemote ? "Remote" : "US"
        if (!isValidJob(job.job_title, location, isRemote)) continue
        allJobs.push({
          title: job.job_title,
          company: job.employer_name,
          company_logo: job.employer_logo,
          location,
          work_mode: isRemote ? "remote" : "onsite",
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

    // Source 2 — Remotive (remote only - worldwide OK)
    try {
      const res = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=100`)
      const data = await res.json()
      for (const job of (data.jobs || [])) {
        if (!isValidJob(job.title, "remote", true)) continue
        allJobs.push({
          title: job.title,
          company: job.company_name,
          company_logo: job.company_logo,
          location: job.candidate_required_location || "Remote (Worldwide)",
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

    // Source 3 — Jobicy (remote only - worldwide OK)
    try {
      const res = await fetch(`https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(query.split(" ")[0])}`)
      const data = await res.json()
      for (const job of (data.jobs || [])) {
        if (!isValidJob(job.jobTitle, "remote", true)) continue
        allJobs.push({
          title: job.jobTitle,
          company: job.companyName,
          company_logo: job.companyLogo || null,
          location: job.jobGeo || "Remote (Worldwide)",
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

    // Source 4 — The Muse (US focused tech companies)
    try {
      const res = await fetch(`https://www.themuse.com/api/public/jobs?descending=true&page=1`)
      const data = await res.json()
      const keyword = query.toLowerCase()
      for (const job of (data.results || []).filter((j: any) =>
        j.name?.toLowerCase().includes(keyword) ||
        j.categories?.some((c: any) => c.name?.toLowerCase().includes(keyword))
      ).slice(0, 20)) {
        const location = job.locations?.[0]?.name || "Remote"
        const isRemote = location.toLowerCase().includes("remote") || location.toLowerCase().includes("flexible")
        if (!isValidJob(job.name, location, isRemote)) continue
        allJobs.push({
          title: job.name,
          company: job.company?.name || "Unknown",
          company_logo: null,
          location,
          work_mode: isRemote ? "remote" : "onsite",
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

    // Source 5 — Adzuna US only
    if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
      try {
        const res = await fetch(
          `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&what=${encodeURIComponent(query)}&results_per_page=50&max_days_old=7`
        )
        const data = await res.json()
        for (const job of (data.results || [])) {
          const location = job.location?.display_name || "US"
          const isRemote = job.title?.toLowerCase().includes("remote") || location.toLowerCase().includes("remote")
          if (!isValidJob(job.title, location, isRemote)) continue
          allJobs.push({
            title: job.title,
            company: job.company?.display_name || "Unknown",
            company_logo: null,
            location,
            work_mode: isRemote ? "remote" : "onsite",
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
        console.log(`Adzuna: ${allJobs.length} total`)
      } catch (e) { console.error("Adzuna error:", e) }
    }

    // Source 6 — Greenhouse (top US tech companies)
    try {
      const companies = ["stripe", "notion", "figma", "anthropic", "databricks", "snowflake", "confluent", "mongodb", "elastic", "cloudflare", "datadog", "github", "gitlab", "hashicorp", "twilio"]
      const keyword = query.toLowerCase()
      for (const company of companies) {
        try {
          const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`)
          const data = await res.json()
          for (const job of (data.jobs || []).filter((j: any) =>
            j.title?.toLowerCase().includes(keyword)
          ).slice(0, 3)) {
            const location = job.location?.name || "Remote"
            const isRemote = location.toLowerCase().includes("remote")
            allJobs.push({
              title: job.title,
              company: company.charAt(0).toUpperCase() + company.slice(1),
              company_logo: null,
              location,
              work_mode: isRemote ? "remote" : "onsite",
              job_type: "full_time",
              salary_min: null,
              salary_max: null,
              source: "greenhouse",
              source_url: job.absolute_url,
              description: job.content?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000) || "",
              external_id: `greenhouse_${job.id}`,
              posted_at: job.updated_at || new Date().toISOString(),
              is_active: true,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            })
          }
        } catch (e) {}
      }
      console.log(`Greenhouse: ${allJobs.length} total`)
    } catch (e) { console.error("Greenhouse error:", e) }

    // Source 7 — Lever (top US tech companies)
    try {
      const leverCompanies = ["netflix", "uber", "lyft", "reddit", "duolingo", "carta", "plaid", "brex", "rippling", "airtable"]
      const keyword = query.toLowerCase()
      for (const company of leverCompanies) {
        try {
          const res = await fetch(`https://api.lever.co/v0/postings/${company}?mode=json`)
          const jobs = await res.json()
          for (const job of (Array.isArray(jobs) ? jobs : []).filter((j: any) =>
            j.text?.toLowerCase().includes(keyword)
          ).slice(0, 3)) {
            const location = job.categories?.location || "Remote"
            const isRemote = location.toLowerCase().includes("remote")
            allJobs.push({
              title: job.text,
              company: company.charAt(0).toUpperCase() + company.slice(1),
              company_logo: null,
              location,
              work_mode: isRemote ? "remote" : "onsite",
              job_type: "full_time",
              salary_min: null,
              salary_max: null,
              source: "lever",
              source_url: job.hostedUrl,
              description: job.descriptionPlain?.slice(0, 5000) || "",
              external_id: `lever_${job.id}`,
              posted_at: job.createdAt ? new Date(job.createdAt).toISOString() : new Date().toISOString(),
              is_active: true,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            })
          }
        } catch (e) {}
      }
      console.log(`Lever: ${allJobs.length} total`)
    } catch (e) { console.error("Lever error:", e) }

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
      sources: "JSearch + Remotive + Jobicy + TheMuse + Adzuna + Greenhouse + Lever",
      message: `✓ Fetched ${saved} US & Remote jobs from 7 sources`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}