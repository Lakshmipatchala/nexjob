import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query") || "software engineer"
  const country = (searchParams.get("country") || "US").toUpperCase()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  const countryNames: Record<string,string> = {
    US:"United States",IN:"India",GB:"United Kingdom",CA:"Canada",
    AU:"Australia",DE:"Germany",SG:"Singapore",AE:"UAE",
    NL:"Netherlands",FR:"France",REMOTE:"Remote"
  }
  const countryName = countryNames[country] || country
  const raw: any[] = []
  // Clean up old jobs first
  await supabase.from("jobs").delete().lt("posted_at", new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString())
  
  // Clean up old jobs first
  await supabase.from("jobs").delete().lt("posted_at", new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString())
  
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const now = new Date().toISOString()
  const expires = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
  const log: Record<string,number> = {}

  // SOURCE 1: JSearch (LinkedIn, Indeed, Glassdoor, Dice, Monster, Naukri)
  try {
    const jsearchCountry = country === "REMOTE" ? "us" : country.toLowerCase()
    const searchQuery = country === "REMOTE" ? `${query} remote` : `${query} ${countryName}`
    let count = 0
    for (let page = 1; page <= 5; page++) {
      try {
        const res = await fetch(
          `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(searchQuery)}&num_pages=1&page=${page}&country=${jsearchCountry}&date_posted=week`,
          { headers: { "x-rapidapi-host": "jsearch.p.rapidapi.com", "x-rapidapi-key": process.env.RAPIDAPI_KEY! } }
        )
        const data = await res.json()
        const jobs = data.data || []
        if (jobs.length === 0) break
        for (const j of jobs) {
          if (!j.job_title || !j.job_apply_link) continue
          // Only include jobs from last 15 days
          const postedAt = j.job_posted_at_datetime_utc ? new Date(j.job_posted_at_datetime_utc) : new Date()
          if (postedAt < new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)) continue
          const isRemote = j.job_is_remote === true
          const loc = j.job_city ? `${j.job_city}, ${j.job_state || j.job_country || countryName}` : isRemote ? "Remote" : countryName
          raw.push({
            title: j.job_title, company: j.employer_name || "Unknown",
            company_logo: j.employer_logo || null, location: loc,
            work_mode: isRemote ? "remote" : "onsite",
            job_type: j.job_employment_type?.toLowerCase().includes("full") ? "full_time" : j.job_employment_type?.toLowerCase().includes("part") ? "part_time" : "contract",
            salary_min: j.job_min_salary || null, salary_max: j.job_max_salary || null,
            source: j.job_publisher?.toLowerCase().includes("linkedin") ? "linkedin"
              : j.job_publisher?.toLowerCase().includes("indeed") ? "indeed"
              : j.job_publisher?.toLowerCase().includes("glassdoor") ? "glassdoor"
              : j.job_publisher?.toLowerCase().includes("dice") ? "dice"
              : j.job_publisher?.toLowerCase().includes("monster") ? "monster"
              : j.job_publisher?.toLowerCase().includes("zip") ? "ziprecruiter"
              : j.job_publisher?.toLowerCase().includes("naukri") ? "naukri"
              : j.job_publisher?.toLowerCase().includes("lensa") ? "lensa" : "other",
            source_url: j.job_apply_link,
            description: j.job_description?.slice(0, 5000) || "",
            external_id: `jsearch_${j.job_id}`,
            posted_at: postedAt.toISOString(),
            is_active: true, expires_at: expires,
          })
          count++
        }
      } catch (e) { break }
    }
    log.jsearch = count
  } catch (e) { log.jsearch = 0 }

  // SOURCE 2: Remotive (free, unlimited, always fresh)
  try {
    const res = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=100`)
    const data = await res.json()
    let count = 0
    for (const j of (data.jobs || [])) {
      if (!j.title || !j.url) continue
      const postedAt = j.publication_date ? new Date(j.publication_date) : new Date()
      raw.push({
        title: j.title, company: j.company_name || "Unknown",
        company_logo: j.company_logo || null,
        location: j.candidate_required_location || "Remote (Worldwide)",
        work_mode: "remote", job_type: "full_time",
        salary_min: null, salary_max: null, source: "remotive",
        source_url: j.url,
        description: j.description?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000) || "",
        external_id: `remotive_${j.id}`,
        posted_at: postedAt.toISOString(),
        is_active: true, expires_at: expires,
      })
      count++
    }
    log.remotive = count
  } catch (e) { log.remotive = 0 }

  // SOURCE 3: Jobicy (free, unlimited remote)
  try {
    const tag = query.split(" ")[0].toLowerCase()
    const res = await fetch(`https://jobicy.com/api/v2/remote-jobs?count=100&tag=${encodeURIComponent(tag)}`)
    const data = await res.json()
    let count = 0
    for (const j of (data.jobs || [])) {
      if (!j.jobTitle || !j.url) continue
      raw.push({
        title: j.jobTitle, company: j.companyName || "Unknown",
        company_logo: j.companyLogo || null,
        location: j.jobGeo || "Remote (Worldwide)",
        work_mode: "remote",
        job_type: j.jobType?.toLowerCase().includes("full") ? "full_time" : "contract",
        salary_min: null, salary_max: null, source: "jobicy",
        source_url: j.url,
        description: j.jobExcerpt?.slice(0, 5000) || "",
        external_id: `jobicy_${j.id}`,
        posted_at: j.pubDate ? new Date(j.pubDate).toISOString() : now,
        is_active: true, expires_at: expires,
      })
      count++
    }
    log.jobicy = count
  } catch (e) { log.jobicy = 0 }

  // SOURCE 4: Greenhouse (direct company boards - always fresh)
  try {
    const companies = [
      "stripe","anthropic","databricks","snowflake","confluent","mongodb",
      "elastic","cloudflare","datadog","github","gitlab","twilio","figma",
      "notion","vercel","brex","plaid","rippling","airtable","canva",
      "clickup","miro","loom","deel","hashicorp","linear","retool",
      "benchling","coinbase","robinhood","chime","gusto","lattice",
      "intercom","zendesk","hubspot","asana","dropbox","okta",
      "airbnb","doordash","ramp","scale","cohere","replit","mercury"
    ]
    const kw = query.toLowerCase()
    let count = 0
    for (const co of companies) {
      try {
        const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${co}/jobs?content=true`)
        const data = await res.json()
        for (const j of (data.jobs || []).filter((j: any) => j.title?.toLowerCase().includes(kw)).slice(0, 5)) {
          if (!j.title || !j.absolute_url) continue
          const loc = j.location?.name || "Remote"
          raw.push({
            title: j.title, company: co.charAt(0).toUpperCase() + co.slice(1),
            company_logo: null, location: loc,
            work_mode: loc.toLowerCase().includes("remote") ? "remote" : "onsite",
            job_type: "full_time", salary_min: null, salary_max: null,
            source: "greenhouse", source_url: j.absolute_url,
            description: j.content?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000) || "",
            external_id: `greenhouse_${j.id}`,
            posted_at: now,
            is_active: true, expires_at: expires,
          })
          count++
        }
      } catch (e) {}
    }
    log.greenhouse = count
  } catch (e) { log.greenhouse = 0 }

  // SOURCE 5: Lever (direct company boards)
  try {
    const companies = [
      "netflix","uber","lyft","reddit","duolingo","carta","scale",
      "miro","benchling","intercom","brex","gusto","chime",
      "lattice","remote","dbt-labs","mercury","clerk","replit","linear"
    ]
    const kw = query.toLowerCase()
    let count = 0
    for (const co of companies) {
      try {
        const res = await fetch(`https://api.lever.co/v0/postings/${co}?mode=json`)
        const jobs = await res.json()
        for (const j of (Array.isArray(jobs) ? jobs : []).filter((j: any) => j.text?.toLowerCase().includes(kw)).slice(0, 5)) {
          if (!j.text || !j.hostedUrl) continue
          const loc = j.categories?.location || "Remote"
          raw.push({
            title: j.text, company: co.charAt(0).toUpperCase() + co.slice(1),
            company_logo: null, location: loc,
            work_mode: loc.toLowerCase().includes("remote") ? "remote" : "onsite",
            job_type: "full_time", salary_min: null, salary_max: null,
            source: "lever", source_url: j.hostedUrl,
            description: j.descriptionPlain?.slice(0, 5000) || "",
            external_id: `lever_${j.id}`,
            posted_at: now,
            is_active: true, expires_at: expires,
          })
          count++
        }
      } catch (e) {}
    }
    log.lever = count
  } catch (e) { log.lever = 0 }

  // SOURCE 6: Adzuna (multi-country)
  if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
    try {
      const ac = ({"US":"us","IN":"in","GB":"gb","CA":"ca","AU":"au","DE":"de","SG":"sg","AE":"ae","NL":"nl","FR":"fr","REMOTE":"us"} as Record<string,string>)[country] || "us"
      let count = 0
      for (let page = 1; page <= 3; page++) {
        try {
          const res = await fetch(`https://api.adzuna.com/v1/api/jobs/${ac}/search/${page}?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&what=${encodeURIComponent(query)}&results_per_page=50&max_days_old=15`)
          const data = await res.json()
          const jobs = data.results || []
          if (jobs.length === 0) break
          for (const j of jobs) {
            if (!j.title || !j.redirect_url) continue
            const loc = j.location?.display_name || countryName
            raw.push({
              title: j.title, company: j.company?.display_name || "Unknown",
              company_logo: null, location: loc,
              work_mode: loc.toLowerCase().includes("remote") || j.title?.toLowerCase().includes("remote") ? "remote" : "onsite",
              job_type: j.contract_time === "full_time" ? "full_time" : "contract",
              salary_min: j.salary_min || null, salary_max: j.salary_max || null,
              source: "adzuna", source_url: j.redirect_url,
              description: j.description?.slice(0, 5000) || "",
              external_id: `adzuna_${j.id}`,
              posted_at: j.created ? new Date(j.created).toISOString() : now,
              is_active: true, expires_at: expires,
            })
            count++
          }
        } catch (e) { break }
      }
      log.adzuna = count
    } catch (e) { log.adzuna = 0 }
  }

  // SOURCE 7: The Muse
  try {
    const res = await fetch(`https://www.themuse.com/api/public/jobs?descending=true&page=1`)
    const data = await res.json()
    const kw = query.toLowerCase()
    let count = 0
    for (const j of (data.results || []).filter((j: any) => j.name?.toLowerCase().includes(kw)).slice(0, 20)) {
      if (!j.name || !j.refs?.landing_page) continue
      const loc = j.locations?.[0]?.name || "Remote"
      raw.push({
        title: j.name, company: j.company?.name || "Unknown",
        company_logo: null, location: loc,
        work_mode: loc.toLowerCase().includes("remote") || loc.toLowerCase().includes("flexible") ? "remote" : "onsite",
        job_type: "full_time", salary_min: null, salary_max: null,
        source: "themuse", source_url: j.refs.landing_page,
        description: j.contents?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000) || "",
        external_id: `themuse_${j.id}`,
        posted_at: now,
        is_active: true, expires_at: expires,
      })
      count++
    }
    log.themuse = count
  } catch (e) { log.themuse = 0 }

  // Deduplicate
  const seen = new Set<string>()
  const unique = raw.filter(j => {
    if (!j.external_id || seen.has(j.external_id)) return false
    seen.add(j.external_id)
    return true
  })

  // Save to database - delete old first then insert fresh
  let saved = 0
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50)
    const { error } = await supabase
      .from("jobs")
      .upsert(batch, { onConflict: "external_id", ignoreDuplicates: false })
    if (!error) saved += batch.length
    else console.error("Upsert error:", error.message)
  }

  return NextResponse.json({
    success: true,
    saved,
    total_found: unique.length,
    sources: log,
    query, country,
    message: `Fetched ${saved} jobs for "${query}" across ${Object.keys(log).length} countries from ${Object.keys(log).length} sources. Sources: ${JSON.stringify(log)}`
  })
}