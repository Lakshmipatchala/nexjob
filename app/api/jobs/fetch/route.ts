import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query") || "software engineer"
    const source = searchParams.get("source") || "all"

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    await supabase.from("jobs").update({ is_active: false })
      .lt("expires_at", new Date().toISOString()).eq("is_active", true)

    let allJobs: any[] = []
    const results: Record<string, number> = {}

    // ── JSearch (LinkedIn/Indeed/Glassdoor) ──
    if (source === "all" || source === "jsearch") {
      try {
        const res = await fetch(
          `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=3&country=us&date_posted=today`,
          { headers: { "x-rapidapi-host": "jsearch.p.rapidapi.com", "x-rapidapi-key": process.env.RAPIDAPI_KEY! } }
        )
        const data = await res.json()
        const jobs = (data.data || []).map((job: any) => ({
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
            : job.job_publisher?.toLowerCase().includes("glassdoor") ? "glassdoor" : "other",
          source_url: job.job_apply_link,
          description: job.job_description?.slice(0, 500) || "",
          external_id: `jsearch_${job.job_id}`,
          posted_at: job.job_posted_at_datetime_utc || new Date().toISOString(),
          is_active: true,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }))
        allJobs = [...allJobs, ...jobs]
        results.jsearch = jobs.length
      } catch (e: any) { results.jsearch_error = e.message }
    }

    // ── Remotive (free remote jobs) ──
    if (source === "all" || source === "remotive") {
      try {
        const searchTerm = query.split(" ").slice(0, 2).join(" ")
        const res = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(searchTerm)}&limit=30`)
        const data = await res.json()
        const jobs = (data.jobs || []).map((job: any) => ({
          title: job.title,
          company: job.company_name,
          company_logo: job.company_logo_url,
          location: "Remote",
          work_mode: "remote",
          job_type: "full_time",
          salary_min: null, salary_max: null,
          source: "remotive",
          source_url: job.url,
          description: job.description?.replace(/<[^>]*>/g, "").slice(0, 500) || "",
          external_id: `remotive_${job.id}`,
          posted_at: job.publication_date || new Date().toISOString(),
          is_active: true,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }))
        allJobs = [...allJobs, ...jobs]
        results.remotive = jobs.length
      } catch (e: any) { results.remotive_error = e.message }
    }

    // ── Adzuna ──
    if ((source === "all" || source === "adzuna") && process.env.ADZUNA_APP_ID) {
      try {
        const res = await fetch(
          `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&what=${encodeURIComponent(query)}&results_per_page=30&max_days_old=7&content-type=application/json`
        )
        const data = await res.json()
        const jobs = (data.results || []).map((job: any) => ({
          title: job.title,
          company: job.company?.display_name || "Unknown",
          company_logo: null,
          location: job.location?.display_name || "USA",
          work_mode: "onsite",
          job_type: "full_time",
          salary_min: job.salary_min ? Math.round(job.salary_min) : null,
          salary_max: job.salary_max ? Math.round(job.salary_max) : null,
          source: "adzuna",
          source_url: job.redirect_url,
          description: job.description?.slice(0, 500) || "",
          external_id: `adzuna_${job.id}`,
          posted_at: job.created || new Date().toISOString(),
          is_active: true,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }))
        allJobs = [...allJobs, ...jobs]
        results.adzuna = jobs.length
      } catch (e: any) { results.adzuna_error = e.message }
    }

    // ── Greenhouse (50+ top tech companies) ──
    if (source === "all" || source === "greenhouse") {
      const companies = [
        "stripe","airbnb","notion","figma","linear","vercel","supabase","openai",
        "anthropic","discord","dropbox","github","gitlab","hashicorp","heroku",
        "intercom","mixpanel","mongodb","netlify","okta","pagerduty","segment",
        "sendgrid","shopify","slack","snowflake","twilio","zendesk","zoom",
        "airtable","amplitude","asana","brex","checkr","clearbit","clerk",
        "cloudflare","cockroachdb","contentful","datadog","dbt","deel","doordash",
        "elastic","envoy","fastly","heap","honeycomb","hubspot","lattice"
      ]
      const keyword = query.toLowerCase().split(" ")[0]
      let ghCount = 0
      for (const company of companies) {
        try {
          const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`)
          if (!res.ok) continue
          const data = await res.json()
          const matched = (data.jobs || [])
            .filter((job: any) => job.title.toLowerCase().includes(keyword))
            .slice(0, 3)
            .map((job: any) => ({
              title: job.title,
              company: company.charAt(0).toUpperCase() + company.slice(1),
              company_logo: null,
              location: job.location?.name || "Remote",
              work_mode: job.location?.name?.toLowerCase().includes("remote") ? "remote" : "onsite",
              job_type: "full_time",
              salary_min: null, salary_max: null,
              source: "greenhouse",
              source_url: job.absolute_url,
              description: job.content?.replace(/<[^>]*>/g, "").slice(0, 500) || "",
              external_id: `greenhouse_${job.id}`,
              posted_at: job.updated_at || new Date().toISOString(),
              is_active: true,
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }))
          allJobs = [...allJobs, ...matched]
          ghCount += matched.length
        } catch (_) {}
        await new Promise(r => setTimeout(r, 50))
      }
      results.greenhouse = ghCount
    }

    // ── Lever (40+ top companies) ──
    if (source === "all" || source === "lever") {
      const companies = [
        "netflix","spotify","coinbase","shopify","atlassian","datadog",
        "reddit","lyft","instacart","robinhood","plaid","scale","anduril",
        "benchling","brex","carto","census","chord","clipboard","cobalt",
        "color","convoy","coreweave","cribl","cruise","dbtlabs","deepmind",
        "density","descript","drift","duolingo","embark","etsy","expel"
      ]
      const keyword = query.toLowerCase().split(" ")[0]
      let leverCount = 0
      for (const company of companies) {
        try {
          const res = await fetch(`https://api.lever.co/v0/postings/${company}?mode=json`)
          if (!res.ok) continue
          const jobs = await res.json()
          if (!Array.isArray(jobs)) continue
          const matched = jobs
            .filter((job: any) => job.text?.toLowerCase().includes(keyword))
            .slice(0, 3)
            .map((job: any) => ({
              title: job.text,
              company: company.charAt(0).toUpperCase() + company.slice(1),
              company_logo: null,
              location: job.categories?.location || "Remote",
              work_mode: job.workplaceType?.toLowerCase().includes("remote") ? "remote" : "onsite",
              job_type: "full_time",
              salary_min: null, salary_max: null,
              source: "lever",
              source_url: job.hostedUrl,
              description: job.descriptionPlain?.slice(0, 500) || "",
              external_id: `lever_${job.id}`,
              posted_at: new Date(job.createdAt || Date.now()).toISOString(),
              is_active: true,
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }))
          allJobs = [...allJobs, ...matched]
          leverCount += matched.length
        } catch (_) {}
        await new Promise(r => setTimeout(r, 50))
      }
      results.lever = leverCount
    }

    // ── Upsert all ──
    if (allJobs.length > 0) {
      const { error } = await supabase.from("jobs")
        .upsert(allJobs, { onConflict: "external_id", ignoreDuplicates: true })
      if (error) throw error
    }

    return NextResponse.json({
      success: true,
      count: allJobs.length,
      query,
      sources: results,
      message: `Fetched ${allJobs.length} jobs from ${Object.keys(results).filter(k => !k.includes("error")).length} sources`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}