import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const COUNTRY_CONFIG: Record<string, { jsearchCountry: string, locationKeyword: string, adzunaCountry: string }> = {
  US:     { jsearchCountry: "us", locationKeyword: "United States", adzunaCountry: "us" },
  IN:     { jsearchCountry: "in", locationKeyword: "India", adzunaCountry: "in" },
  GB:     { jsearchCountry: "gb", locationKeyword: "United Kingdom", adzunaCountry: "gb" },
  CA:     { jsearchCountry: "ca", locationKeyword: "Canada", adzunaCountry: "ca" },
  AU:     { jsearchCountry: "au", locationKeyword: "Australia", adzunaCountry: "au" },
  DE:     { jsearchCountry: "de", locationKeyword: "Germany", adzunaCountry: "de" },
  SG:     { jsearchCountry: "sg", locationKeyword: "Singapore", adzunaCountry: "sg" },
  AE:     { jsearchCountry: "ae", locationKeyword: "UAE", adzunaCountry: "ae" },
  REMOTE: { jsearchCountry: "us", locationKeyword: "Remote", adzunaCountry: "us" },
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query") || "software engineer"
    const countryCode = searchParams.get("country") || "US"
    const config = COUNTRY_CONFIG[countryCode] || COUNTRY_CONFIG.US
    const isRemoteOnly = countryCode === "REMOTE"

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    const raw: any[] = []

    // SOURCE 1: JSearch - works for all countries
    try {
      const searchQuery = isRemoteOnly
        ? `${query} remote`
        : `${query} ${config.locationKeyword}`

      const res = await fetch(
        `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(searchQuery)}&num_pages=5&country=${config.jsearchCountry}&date_posted=week`,
        { headers: { "x-rapidapi-host": "jsearch.p.rapidapi.com", "x-rapidapi-key": process.env.RAPIDAPI_KEY! } }
      )
      const data = await res.json()
      for (const j of (data.data || [])) {
        const isRemote = j.job_is_remote === true || isRemoteOnly
        const loc = j.job_city
          ? `${j.job_city}, ${j.job_state || j.job_country || config.locationKeyword}`
          : isRemote ? "Remote" : config.locationKeyword

        raw.push({
          title: j.job_title,
          company: j.employer_name,
          company_logo: j.employer_logo,
          location: loc,
          work_mode: isRemote ? "remote" : "onsite",
          job_type: j.job_employment_type?.toLowerCase().includes("full") ? "full_time" : "contract",
          salary_min: j.job_min_salary || null,
          salary_max: j.job_max_salary || null,
          source: j.job_publisher?.toLowerCase().includes("linkedin") ? "linkedin"
            : j.job_publisher?.toLowerCase().includes("indeed") ? "indeed"
            : j.job_publisher?.toLowerCase().includes("glassdoor") ? "glassdoor"
            : j.job_publisher?.toLowerCase().includes("dice") ? "dice"
            : "other",
          source_url: j.job_apply_link,
          description: j.job_description?.slice(0, 5000) || "",
          external_id: `jsearch_${j.job_id}`,
          posted_at: j.job_posted_at_datetime_utc || new Date().toISOString(),
          is_active: true,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
      console.log(`JSearch: ${raw.length}`)
    } catch (e) { console.error("JSearch:", e) }

    // SOURCE 2: Remotive - Remote worldwide (always include)
    try {
      const res = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=50`)
      const data = await res.json()
      for (const j of (data.jobs || [])) {
        raw.push({
          title: j.title,
          company: j.company_name,
          company_logo: j.company_logo,
          location: j.candidate_required_location || "Remote (Worldwide)",
          work_mode: "remote",
          job_type: "full_time",
          salary_min: null, salary_max: null,
          source: "remotive",
          source_url: j.url,
          description: j.description?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000) || "",
          external_id: `remotive_${j.id}`,
          posted_at: j.publication_date || new Date().toISOString(),
          is_active: true,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
      console.log(`Remotive: ${raw.length}`)
    } catch (e) { console.error("Remotive:", e) }

    // SOURCE 3: Jobicy - Remote worldwide (always include)
    try {
      const tag = query.split(" ")[0].toLowerCase()
      const res = await fetch(`https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(tag)}`)
      const data = await res.json()
      for (const j of (data.jobs || [])) {
        if (!j.jobTitle) continue
        raw.push({
          title: j.jobTitle,
          company: j.companyName,
          company_logo: j.companyLogo || null,
          location: j.jobGeo || "Remote (Worldwide)",
          work_mode: "remote",
          job_type: j.jobType?.includes("full") ? "full_time" : "contract",
          salary_min: null, salary_max: null,
          source: "jobicy",
          source_url: j.url,
          description: j.jobExcerpt?.slice(0, 5000) || "",
          external_id: `jobicy_${j.id}`,
          posted_at: j.pubDate || new Date().toISOString(),
          is_active: true,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
      console.log(`Jobicy: ${raw.length}`)
    } catch (e) { console.error("Jobicy:", e) }

    // SOURCE 4: Greenhouse - Top tech companies (US/Remote focused)
    if (countryCode === "US" || countryCode === "REMOTE") {
      try {
        const companies = ["stripe","anthropic","databricks","snowflake","confluent","mongodb","elastic","cloudflare","datadog","github","gitlab","twilio","figma","notion","vercel","brex","plaid","rippling","airtable","canva"]
        const kw = query.toLowerCase()
        for (const co of companies) {
          try {
            const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${co}/jobs?content=true`)
            const data = await res.json()
            for (const j of (data.jobs || []).filter((j: any) => j.title?.toLowerCase().includes(kw)).slice(0, 3)) {
              const loc = j.location?.name || "Remote"
              const isRemote = loc.toLowerCase().includes("remote")
              raw.push({
                title: j.title,
                company: co.charAt(0).toUpperCase() + co.slice(1),
                company_logo: null,
                location: loc,
                work_mode: isRemote ? "remote" : "onsite",
                job_type: "full_time",
                salary_min: null, salary_max: null,
                source: "greenhouse",
                source_url: j.absolute_url,
                description: j.content?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000) || "",
                external_id: `greenhouse_${j.id}`,
                posted_at: j.updated_at || new Date().toISOString(),
                is_active: true,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              })
            }
          } catch (e) {}
        }
        console.log(`Greenhouse: ${raw.length}`)
      } catch (e) { console.error("Greenhouse:", e) }
    }

    // SOURCE 5: Lever - More tech companies
    if (countryCode === "US" || countryCode === "REMOTE") {
      try {
        const companies = ["netflix","uber","lyft","reddit","duolingo","carta","rippling","clickup","miro","loom","benchling","scale","deel","remote","dbt-labs"]
        const kw = query.toLowerCase()
        for (const co of companies) {
          try {
            const res = await fetch(`https://api.lever.co/v0/postings/${co}?mode=json`)
            const jobs = await res.json()
            for (const j of (Array.isArray(jobs) ? jobs : []).filter((j: any) => j.text?.toLowerCase().includes(kw)).slice(0, 3)) {
              const loc = j.categories?.location || "Remote"
              const isRemote = loc.toLowerCase().includes("remote")
              raw.push({
                title: j.text,
                company: co.charAt(0).toUpperCase() + co.slice(1),
                company_logo: null,
                location: loc,
                work_mode: isRemote ? "remote" : "onsite",
                job_type: "full_time",
                salary_min: null, salary_max: null,
                source: "lever",
                source_url: j.hostedUrl,
                description: j.descriptionPlain?.slice(0, 5000) || "",
                external_id: `lever_${j.id}`,
                posted_at: j.createdAt ? new Date(j.createdAt).toISOString() : new Date().toISOString(),
                is_active: true,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              })
            }
          } catch (e) {}
        }
        console.log(`Lever: ${raw.length}`)
      } catch (e) { console.error("Lever:", e) }
    }

    // SOURCE 6: Adzuna - Multi country support
    if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
      try {
        const adzunaCountry = config.adzunaCountry
        const res = await fetch(
          `https://api.adzuna.com/v1/api/jobs/${adzunaCountry}/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&what=${encodeURIComponent(query)}&results_per_page=50&max_days_old=7`
        )
        const data = await res.json()
        for (const j of (data.results || [])) {
          const loc = j.location?.display_name || config.locationKeyword
          const isRemote = j.title?.toLowerCase().includes("remote") || loc.toLowerCase().includes("remote")
          raw.push({
            title: j.title,
            company: j.company?.display_name || "Unknown",
            company_logo: null,
            location: loc,
            work_mode: isRemote ? "remote" : "onsite",
            job_type: j.contract_time === "full_time" ? "full_time" : "contract",
            salary_min: j.salary_min || null,
            salary_max: j.salary_max || null,
            source: "adzuna",
            source_url: j.redirect_url,
            description: j.description?.slice(0, 5000) || "",
            external_id: `adzuna_${j.id}`,
            posted_at: j.created || new Date().toISOString(),
            is_active: true,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          })
        }
        console.log(`Adzuna: ${raw.length}`)
      } catch (e) { console.error("Adzuna:", e) }
    }

    // Deduplicate
    const seen = new Set()
    const unique = raw.filter(j => {
      if (!j.external_id || seen.has(j.external_id)) return false
      seen.add(j.external_id)
      return true
    })

    // Save in batches
    let saved = 0
    for (let i = 0; i < unique.length; i += 50) {
      const { error } = await supabase
        .from("jobs")
        .upsert(unique.slice(i, i + 50), { onConflict: "external_id", ignoreDuplicates: false })
      if (!error) saved += Math.min(50, unique.length - i)
      else console.error("batch error:", error.message)
    }

    const countryName = COUNTRIES_DISPLAY[countryCode] || countryCode
    return NextResponse.json({
      success: true,
      count: saved,
      query,
      country: countryCode,
      message: `✓ Fetched ${saved} "${query}" jobs in ${countryName} from 6 sources`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

const COUNTRIES_DISPLAY: Record<string, string> = {
  US: "United States", IN: "India", GB: "United Kingdom",
  CA: "Canada", AU: "Australia", DE: "Germany",
  SG: "Singapore", AE: "UAE", REMOTE: "Remote (Worldwide)"
}