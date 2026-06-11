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
  const now = new Date().toISOString()
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const log: Record<string,number> = {}

  // SOURCE 1a: Active Jobs DB (LinkedIn Indeed Glassdoor + 16 sites - separate quota)
  try {
    const jsearchCountry = country === "REMOTE" ? "us" : country.toLowerCase()
    const searchQuery = country === "REMOTE" ? `${query} remote` : `${query} ${countryName}`
    let count = 0
    for (let page = 1; page <= 3; page++) {
      try {
        const res = await fetch(
          `https://active-jobs-db.p.rapidapi.com/active-ats-7d?offset=${(page-1)*25}&limit=25&title_filter=${encodeURIComponent(query)}&location_filter=${country === "REMOTE" ? "" : encodeURIComponent(countryName)}`,
          { headers: { "x-rapidapi-host": "active-jobs-db.p.rapidapi.com", "x-rapidapi-key": process.env.RAPIDAPI_KEY || "" } }
        )
        if (!res.ok) break
        const data = await res.json()
        const jobs = Array.isArray(data) ? data : []
        if (jobs.length === 0) break
        for (const j of jobs) {
          if (!j.title || !j.url) continue
          const isRemote = j.remote === true || j.title?.toLowerCase().includes("remote")
          raw.push({
            title: j.title, company: j.organization || "Unknown",
            company_logo: j.organization_logo || null,
            location: j.locations_raw?.[0] || (isRemote ? "Remote" : countryName),
            work_mode: isRemote ? "remote" : "onsite",
            job_type: j.employment_type?.toLowerCase().includes("full") ? "full_time" : "contract",
            salary_min: null, salary_max: null,
            source: j.source?.toLowerCase().includes("linkedin") ? "linkedin"
              : j.source?.toLowerCase().includes("indeed") ? "indeed"
              : j.source?.toLowerCase().includes("glassdoor") ? "glassdoor" : "other",
            source_url: j.url,
            description: j.text?.slice(0, 5000) || "",
            external_id: `activejobs_${j.id || Buffer.from(j.url).toString("base64").slice(0,20)}`,
            posted_at: j.date_posted || now,
            is_active: true, expires_at: expires,
          })
          count++
        }
      } catch (e) { break }
    }
    log.activejobs = count
  } catch (e) { log.activejobs = 0 }

  // SOURCE 1b: LinkedIn Jobs Search API (separate quota)
  try {
    const res = await fetch(
      `https://linkedin-jobs-search.p.rapidapi.com/?search=${encodeURIComponent(query)}&location=${encodeURIComponent(country === "REMOTE" ? "Worldwide" : countryName)}&page=1&pageSize=25`,
      { headers: { "x-rapidapi-host": "linkedin-jobs-search.p.rapidapi.com", "x-rapidapi-key": process.env.RAPIDAPI_KEY || "" } }
    )
    if (res.ok) {
      const data = await res.json()
      let count = 0
      for (const j of (Array.isArray(data) ? data : [])) {
        if (!j.title || !j.job_url) continue
        raw.push({
          title: j.title, company: j.company || "Unknown",
          company_logo: j.company_logo || null,
          location: j.location || countryName,
          work_mode: j.title?.toLowerCase().includes("remote") || j.location?.toLowerCase().includes("remote") ? "remote" : "onsite",
          job_type: j.employment_type?.toLowerCase().includes("full") ? "full_time" : "contract",
          salary_min: null, salary_max: null,
          source: "linkedin",
          source_url: j.job_url,
          description: j.description?.slice(0, 5000) || "",
          external_id: `linkedin_${j.job_id || Buffer.from(j.job_url).toString("base64").slice(0,20)}`,
          posted_at: j.posted_date || now,
          is_active: true, expires_at: expires,
        })
        count++
      }
      log.linkedin_direct = count
    }
  } catch (e) { log.linkedin_direct = 0 }

  // SOURCE 1: JSearch
  try {
    const jsearchCountry = country === "REMOTE" ? "us" : country.toLowerCase()
    const searchQuery = country === "REMOTE" ? `${query} remote` : `${query} ${countryName}`
    let count = 0
    for (let page = 1; page <= 5; page++) {
      try {
        const res = await fetch(
          `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(searchQuery)}&num_pages=1&page=${page}&country=${jsearchCountry}&date_posted=month`,
          { headers: { "x-rapidapi-host": "jsearch.p.rapidapi.com", "x-rapidapi-key": process.env.RAPIDAPI_KEY || "" } }
        )
        if (!res.ok) break
        const data = await res.json()
        const jobs = data.data || []
        if (jobs.length === 0) break
        for (const j of jobs) {
          if (!j.job_title || !j.job_apply_link) continue
          const isRemote = j.job_is_remote === true
          const loc = j.job_city ? `${j.job_city}, ${j.job_state || j.job_country || countryName}` : isRemote ? "Remote" : countryName
          raw.push({
            title: j.job_title, company: j.employer_name || "Unknown",
            company_logo: j.employer_logo || null, location: loc,
            work_mode: isRemote ? "remote" : "onsite",
            job_type: j.job_employment_type?.toLowerCase().includes("full") ? "full_time" : "contract",
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
            posted_at: j.job_posted_at_datetime_utc || now,
            is_active: true, expires_at: expires,
          })
          count++
        }
      } catch (e) { break }
    }
    log.jsearch = count
  } catch (e) { log.jsearch = 0 }

  // SOURCE 2: Jooble (LinkedIn Indeed Monster)
  try {
    const locationMap: Record<string,string> = {
      US:"United States",IN:"India",GB:"United Kingdom",
      CA:"Canada",AU:"Australia",DE:"Germany",
      SG:"Singapore",AE:"Dubai",REMOTE:""
    }
    const res = await fetch(`https://jooble.org/api/${process.env.JOOBLE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keywords: query,
        location: locationMap[country] || "",
        page: "1",
        resultonpage: "100"
      })
    })
    if (res.ok) {
      const data = await res.json()
      let count = 0
      for (const j of (data.jobs || [])) {
        if (!j.title || !j.link) continue
        raw.push({
          title: j.title.trim(), company: j.company || "Unknown",
          company_logo: null, location: j.location || countryName,
          work_mode: j.title?.toLowerCase().includes("remote") || j.location?.toLowerCase().includes("remote") ? "remote" : "onsite",
          job_type: j.type?.toLowerCase().includes("full") ? "full_time" : "contract",
          salary_min: null, salary_max: null, source: "jooble",
          source_url: j.link,
          description: j.snippet?.slice(0, 5000) || "",
          external_id: `jooble_${Buffer.from(j.link).toString("base64").slice(0, 30)}`,
          posted_at: j.updated ? new Date(j.updated).toISOString() : now,
          is_active: true, expires_at: expires,
        })
        count++
      }
      log.jooble = count
    } else {
      log.jooble = 0
    }
  } catch (e) { log.jooble = 0 }

  // SOURCE 3: Remotive
  try {
    const res = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=100`)
    const data = await res.json()
    let count = 0
    for (const j of (data.jobs || [])) {
      if (!j.title || !j.url) continue
      raw.push({
        title: j.title, company: j.company_name || "Unknown",
        company_logo: j.company_logo || null,
        location: j.candidate_required_location || "Remote (Worldwide)",
        work_mode: "remote", job_type: "full_time",
        salary_min: null, salary_max: null, source: "remotive",
        source_url: j.url,
        description: j.description?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000) || "",
        external_id: `remotive_${j.id}`,
        posted_at: j.publication_date ? new Date(j.publication_date).toISOString() : now,
        is_active: true, expires_at: expires,
      })
      count++
    }
    log.remotive = count
  } catch (e) { log.remotive = 0 }

  // SOURCE 4: Jobicy
  try {
    const res = await fetch(`https://jobicy.com/api/v2/remote-jobs?count=100`)
    const data = await res.json()
    const kw = query.toLowerCase()
    let count = 0
    for (const j of (data.jobs || []).filter((j: any) =>
      j.jobTitle?.toLowerCase().includes(kw) || j.jobExcerpt?.toLowerCase().includes(kw)
    )) {
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

  // SOURCE 5: Himalayas
  try {
    const res = await fetch(`https://himalayas.app/jobs/api?q=${encodeURIComponent(query)}&limit=100`)
    const data = await res.json()
    let count = 0
    for (const j of (data.jobs || [])) {
      if (!j.title || !j.applicationLink) continue
      raw.push({
        title: j.title, company: j.companyName || "Unknown",
        company_logo: j.companyLogo || null,
        location: j.locationRestrictions?.[0] || "Remote (Worldwide)",
        work_mode: "remote",
        job_type: j.jobType?.toLowerCase().includes("full") ? "full_time" : "contract",
        salary_min: j.salaryMin || null, salary_max: j.salaryMax || null,
        source: "himalayas", source_url: j.applicationLink,
        description: j.description?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000) || "",
        external_id: `himalayas_${j.id}`,
        posted_at: j.createdAt ? new Date(j.createdAt).toISOString() : now,
        is_active: true, expires_at: expires,
      })
      count++
    }
    log.himalayas = count
  } catch (e) { log.himalayas = 0 }

  // SOURCE 6: Greenhouse
  try {
    const companies = [
      "stripe","anthropic","databricks","snowflake","confluent","mongodb",
      "elastic","cloudflare","datadog","github","gitlab","twilio","figma",
      "notion","vercel","brex","plaid","rippling","airtable","canva",
      "clickup","miro","loom","deel","hashicorp","linear","retool",
      "benchling","coinbase","robinhood","chime","gusto","lattice",
      "intercom","zendesk","hubspot","asana","dropbox","okta",
      "airbnb","doordash","ramp","scale","cohere","replit","mercury",
      "openai","perplexity","salesforce","nvidia","palantir","duolingo",
      "pinterest","snap","reddit","discord","shopify","square","affirm"
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
            posted_at: now, is_active: true, expires_at: expires,
          })
          count++
        }
      } catch (e) {}
    }
    log.greenhouse = count
  } catch (e) { log.greenhouse = 0 }

  // SOURCE 7: Lever
  try {
    const companies = [
      "stripe","shopify","atlassian","twilio","zendesk",
      "hubspot","intercom","brex","gusto","lattice",
      "mercury","linear","replit","retool","watershed",
      "clerk","loops","dbt-labs","figma","notion"
    ]
    const kw = query.toLowerCase()
    let count = 0
    for (const co of companies) {
      try {
        const res = await fetch(`https://api.lever.co/v0/postings/${co}?mode=json&limit=50`)
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
            posted_at: now, is_active: true, expires_at: expires,
          })
          count++
        }
      } catch (e) {}
    }
    log.lever = count
  } catch (e) { log.lever = 0 }

  // SOURCE 8: Ashby
  try {
    const companies = [
      "openai","perplexity","cursor","linear","retool","figma",
      "notion","vercel","supabase","neon","fly","railway","render",
      "clerk","resend","loops","cal","mistral","cohere","together",
      "replicate","modal","scale","hex","deepnote","airbyte",
      "fivetran","dagster","weights-biases"
    ]
    const kw = query.toLowerCase()
    let count = 0
    for (const co of companies) {
      try {
        const res = await fetch(`https://jobs.ashbyhq.com/api/non-user-graphql`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operationName: "ApiJobBoardWithTeams",
            variables: { organizationHostedJobsPageName: co },
            query: "query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) { jobBoard: jobBoardWithTeams(organizationHostedJobsPageName: $organizationHostedJobsPageName) { jobPostings { id title locationName employmentType } } }"
          })
        })
        const data = await res.json()
        for (const j of (data?.data?.jobBoard?.jobPostings || []).filter((j: any) => j.title?.toLowerCase().includes(kw)).slice(0, 5)) {
          raw.push({
            title: j.title, company: co.charAt(0).toUpperCase() + co.slice(1),
            company_logo: null, location: j.locationName || "Remote",
            work_mode: j.locationName?.toLowerCase().includes("remote") ? "remote" : "onsite",
            job_type: j.employmentType?.toLowerCase().includes("full") ? "full_time" : "contract",
            salary_min: null, salary_max: null,
            source: "ashby", source_url: `https://jobs.ashbyhq.com/${co}/${j.id}`,
            description: "", external_id: `ashby_${j.id}`,
            posted_at: now, is_active: true, expires_at: expires,
          })
          count++
        }
      } catch (e) {}
    }
    log.ashby = count
  } catch (e) { log.ashby = 0 }

  // SOURCE 9: Adzuna
  if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
    try {
      const ac = ({"US":"us","IN":"in","GB":"gb","CA":"ca","AU":"au","DE":"de","SG":"sg","AE":"ae","NL":"nl","FR":"fr","REMOTE":"us"} as Record<string,string>)[country] || "us"
      let count = 0
      for (let page = 1; page <= 3; page++) {
        try {
          const res = await fetch(`https://api.adzuna.com/v1/api/jobs/${ac}/search/${page}?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&what=${encodeURIComponent(query)}&results_per_page=50&max_days_old=30`)
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

  // Deduplicate
  const seen = new Set<string>()
  const unique = raw.filter(j => {
    if (!j.external_id || seen.has(j.external_id)) return false
    seen.add(j.external_id)
    return true
  })

  // Save
  let saved = 0
  for (let i = 0; i < unique.length; i += 50) {
    const { error } = await supabase
      .from("jobs")
      .upsert(unique.slice(i, i + 50), { onConflict: "external_id", ignoreDuplicates: false })
    if (!error) saved += Math.min(50, unique.length - i)
  }

  return NextResponse.json({
    success: true, saved,
    total_found: unique.length,
    sources: log, query, country,
    message: `Fetched ${saved} jobs for "${query}" — ${JSON.stringify(log)}`
  })
}