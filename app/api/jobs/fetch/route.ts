import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const COUNTRY_CONFIG: Record<string, {
  jsearchCountry: string
  adzunaCountry: string
  locationKeywords: string[]
  blockKeywords: string[]
}> = {
  US: {
    jsearchCountry: "us",
    adzunaCountry: "us",
    locationKeywords: ["united states","usa"," us,"," us)"," al,"," ak,"," az,"," ar,"," ca,"," co,"," ct,"," de,"," fl,"," ga,"," hi,"," id,"," il,"," in,"," ia,"," ks,"," ky,"," la,"," me,"," md,"," ma,"," mi,"," mn,"," ms,"," mo,"," mt,"," ne,"," nv,"," nh,"," nj,"," nm,"," ny,"," nc,"," nd,"," oh,"," ok,"," or,"," pa,"," ri,"," sc,"," sd,"," tn,"," tx,"," ut,"," vt,"," va,"," wa,"," wv,"," wi,"," wy,"," dc,","new york","san francisco","los angeles","chicago","seattle","boston","austin","denver","atlanta","dallas","houston","phoenix","philadelphia","san diego","portland","nashville","miami","raleigh","minneapolis"],
    blockKeywords: ["india","bengaluru","bangalore","mumbai","delhi","hyderabad","pune","chennai","gurugram","noida","canada","toronto","vancouver","montreal","france","paris","germany","berlin","munich","uk","london","australia","sydney","singapore","japan","china","brazil","mexico","ireland","netherlands","spain","italy","poland","sweden","israel","apac","emea","latam"]
  },
  IN: {
    jsearchCountry: "in",
    adzunaCountry: "in",
    locationKeywords: ["india","bengaluru","bangalore","mumbai","delhi","hyderabad","pune","chennai","gurugram","noida","kolkata","ahmedabad","jaipur","surat"],
    blockKeywords: []
  },
  GB: {
    jsearchCountry: "gb",
    adzunaCountry: "gb",
    locationKeywords: ["united kingdom","uk","london","manchester","birmingham","edinburgh","glasgow","bristol","leeds","sheffield"],
    blockKeywords: []
  },
  CA: {
    jsearchCountry: "ca",
    adzunaCountry: "ca",
    locationKeywords: ["canada","toronto","vancouver","montreal","ottawa","calgary","edmonton","winnipeg"],
    blockKeywords: []
  },
  AU: {
    jsearchCountry: "au",
    adzunaCountry: "au",
    locationKeywords: ["australia","sydney","melbourne","brisbane","perth","adelaide","canberra"],
    blockKeywords: []
  },
  DE: {
    jsearchCountry: "de",
    adzunaCountry: "de",
    locationKeywords: ["germany","berlin","munich","frankfurt","hamburg","cologne","stuttgart","dusseldorf"],
    blockKeywords: []
  },
  SG: {
    jsearchCountry: "sg",
    adzunaCountry: "sg",
    locationKeywords: ["singapore"],
    blockKeywords: []
  },
  AE: {
    jsearchCountry: "ae",
    adzunaCountry: "ae",
    locationKeywords: ["uae","dubai","abu dhabi","sharjah"],
    blockKeywords: []
  },
  REMOTE: {
    jsearchCountry: "us",
    adzunaCountry: "us",
    locationKeywords: ["remote","worldwide","anywhere","global"],
    blockKeywords: []
  }
}

function isValidLocation(location: string, countryCode: string, isRemote: boolean): boolean {
  if (isRemote) return true
  if (countryCode === "REMOTE") return isRemote
  const config = COUNTRY_CONFIG[countryCode]
  if (!config) return true
  const loc = location.toLowerCase()
  if (config.blockKeywords.some(k => loc.includes(k))) return false
  if (config.locationKeywords.length === 0) return true
  return config.locationKeywords.some(k => loc.includes(k))
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query") || "software engineer"
    const countryCode = (searchParams.get("country") || "US").toUpperCase()
    const config = COUNTRY_CONFIG[countryCode] || COUNTRY_CONFIG.US
    const isRemoteOnly = countryCode === "REMOTE"

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    const raw: any[] = []
    const countryNames: Record<string,string> = {
      US:"United States",IN:"India",GB:"United Kingdom",CA:"Canada",
      AU:"Australia",DE:"Germany",SG:"Singapore",AE:"UAE",REMOTE:"Remote (Worldwide)"
    }
    const countryName = countryNames[countryCode] || countryCode

    // SOURCE 1: JSearch - LinkedIn, Indeed, Glassdoor, Dice
    try {
      const searchQuery = isRemoteOnly
        ? `${query} remote work from home`
        : `${query} ${countryName}`

      for (let page = 1; page <= 5; page++) {
        const res = await fetch(
          `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(searchQuery)}&num_pages=1&page=${page}&country=${config.jsearchCountry}&date_posted=week`,
          { headers: { "x-rapidapi-host": "jsearch.p.rapidapi.com", "x-rapidapi-key": process.env.RAPIDAPI_KEY! } }
        )
        const data = await res.json()
        const jobs = data.data || []
        if (jobs.length === 0) break

        for (const j of jobs) {
          const isRemote = j.job_is_remote === true || isRemoteOnly
          const loc = j.job_city
            ? `${j.job_city}, ${j.job_state || j.job_country || ""}`
            : isRemote ? `Remote` : countryName

          if (!isValidLocation(loc, countryCode, isRemote)) continue

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
              : j.job_publisher?.toLowerCase().includes("monster") ? "monster"
              : j.job_publisher?.toLowerCase().includes("zip") ? "ziprecruiter"
              : "other",
            source_url: j.job_apply_link,
            description: j.job_description?.slice(0, 5000) || "",
            external_id: `jsearch_${j.job_id}`,
            posted_at: j.job_posted_at_datetime_utc || new Date().toISOString(),
            is_active: true,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          })
        }
      }
      console.log(`JSearch: ${raw.length}`)
    } catch (e) { console.error("JSearch:", e) }

    // SOURCE 2: Remotive - Remote worldwide (always fetch)
    try {
      const res = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=100`)
      const data = await res.json()
      for (const j of (data.jobs || [])) {
        raw.push({
          title: j.title, company: j.company_name, company_logo: j.company_logo,
          location: j.candidate_required_location || "Remote (Worldwide)",
          work_mode: "remote", job_type: "full_time",
          salary_min: null, salary_max: null, source: "remotive",
          source_url: j.url,
          description: j.description?.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,5000)||"",
          external_id: `remotive_${j.id}`,
          posted_at: j.publication_date || new Date().toISOString(),
          is_active: true,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
      console.log(`Remotive: ${raw.length}`)
    } catch (e) { console.error("Remotive:", e) }

    // SOURCE 3: Jobicy - Remote worldwide
    try {
      const tag = query.split(" ")[0].toLowerCase()
      const res = await fetch(`https://jobicy.com/api/v2/remote-jobs?count=100&tag=${encodeURIComponent(tag)}`)
      const data = await res.json()
      for (const j of (data.jobs || [])) {
        if (!j.jobTitle) continue
        raw.push({
          title: j.jobTitle, company: j.companyName, company_logo: j.companyLogo||null,
          location: j.jobGeo || "Remote (Worldwide)", work_mode: "remote",
          job_type: j.jobType?.includes("full") ? "full_time" : "contract",
          salary_min: null, salary_max: null, source: "jobicy",
          source_url: j.url,
          description: j.jobExcerpt?.slice(0,5000)||"",
          external_id: `jobicy_${j.id}`,
          posted_at: j.pubDate || new Date().toISOString(),
          is_active: true,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
      console.log(`Jobicy: ${raw.length}`)
    } catch (e) { console.error("Jobicy:", e) }

    // SOURCE 4: Greenhouse - US/Remote tech companies
    if (countryCode === "US" || countryCode === "REMOTE") {
      try {
        const cos = ["stripe","anthropic","databricks","snowflake","confluent","mongodb","elastic","cloudflare","datadog","github","gitlab","twilio","figma","notion","vercel","brex","plaid","rippling","airtable","canva","clickup","miro","loom","deel","remote","dbt-labs","hashicorp","linear","retool","benchling"]
        const kw = query.toLowerCase()
        for (const co of cos) {
          try {
            const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${co}/jobs?content=true`)
            const data = await res.json()
            for (const j of (data.jobs||[]).filter((j:any)=>j.title?.toLowerCase().includes(kw)).slice(0,5)) {
              const loc = j.location?.name || "Remote"
              const isRemote = loc.toLowerCase().includes("remote")
              if (!isValidLocation(loc, countryCode, isRemote)) continue
              raw.push({
                title: j.title, company: co.charAt(0).toUpperCase()+co.slice(1), company_logo: null,
                location: loc, work_mode: isRemote?"remote":"onsite", job_type: "full_time",
                salary_min: null, salary_max: null, source: "greenhouse",
                source_url: j.absolute_url,
                description: j.content?.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,5000)||"",
                external_id: `greenhouse_${j.id}`,
                posted_at: j.updated_at||new Date().toISOString(),
                is_active: true,
                expires_at: new Date(Date.now()+7*24*60*60*1000).toISOString(),
              })
            }
          } catch(e){}
        }
        console.log(`Greenhouse: ${raw.length}`)
      } catch(e) { console.error("Greenhouse:", e) }
    }

    // SOURCE 5: Lever - US/Remote tech companies
    if (countryCode === "US" || countryCode === "REMOTE") {
      try {
        const cos = ["netflix","uber","lyft","reddit","duolingo","carta","rippling","clickup","miro","loom","benchling","scale","deel","remote","coinbase","robinhood","chime","gusto","lattice","greenhouse"]
        const kw = query.toLowerCase()
        for (const co of cos) {
          try {
            const res = await fetch(`https://api.lever.co/v0/postings/${co}?mode=json`)
            const jobs = await res.json()
            for (const j of (Array.isArray(jobs)?jobs:[]).filter((j:any)=>j.text?.toLowerCase().includes(kw)).slice(0,5)) {
              const loc = j.categories?.location || "Remote"
              const isRemote = loc.toLowerCase().includes("remote")
              if (!isValidLocation(loc, countryCode, isRemote)) continue
              raw.push({
                title: j.text, company: co.charAt(0).toUpperCase()+co.slice(1), company_logo: null,
                location: loc, work_mode: isRemote?"remote":"onsite", job_type: "full_time",
                salary_min: null, salary_max: null, source: "lever",
                source_url: j.hostedUrl,
                description: j.descriptionPlain?.slice(0,5000)||"",
                external_id: `lever_${j.id}`,
                posted_at: j.createdAt?new Date(j.createdAt).toISOString():new Date().toISOString(),
                is_active: true,
                expires_at: new Date(Date.now()+7*24*60*60*1000).toISOString(),
              })
            }
          } catch(e){}
        }
        console.log(`Lever: ${raw.length}`)
      } catch(e) { console.error("Lever:", e) }
    }

    // SOURCE 6: Adzuna - Multi country
    if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
      const adzunaCountries: Record<string,string> = {
        US:"us",IN:"in",GB:"gb",CA:"ca",AU:"au",DE:"de",SG:"sg",AE:"ae",REMOTE:"us"
      }
      const ac = adzunaCountries[countryCode] || "us"
      try {
        for (let page = 1; page <= 3; page++) {
          const res = await fetch(
            `https://api.adzuna.com/v1/api/jobs/${ac}/search/${page}?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&what=${encodeURIComponent(query)}&results_per_page=50&max_days_old=7`
          )
          const data = await res.json()
          const jobs = data.results || []
          if (jobs.length === 0) break
          for (const j of jobs) {
            const loc = j.location?.display_name || countryName
            const isRemote = j.title?.toLowerCase().includes("remote")||loc.toLowerCase().includes("remote")
            if (!isValidLocation(loc, countryCode, isRemote)) continue
            raw.push({
              title: j.title, company: j.company?.display_name||"Unknown", company_logo: null,
              location: loc, work_mode: isRemote?"remote":"onsite",
              job_type: j.contract_time==="full_time"?"full_time":"contract",
              salary_min: j.salary_min||null, salary_max: j.salary_max||null,
              source: "adzuna", source_url: j.redirect_url,
              description: j.description?.slice(0,5000)||"",
              external_id: `adzuna_${j.id}`,
              posted_at: j.created||new Date().toISOString(),
              is_active: true,
              expires_at: new Date(Date.now()+7*24*60*60*1000).toISOString(),
            })
          }
        }
        console.log(`Adzuna: ${raw.length}`)
      } catch(e) { console.error("Adzuna:", e) }
    }

    // Deduplicate by external_id
    const seen = new Set()
    const unique = raw.filter(j => {
      if (!j.external_id || seen.has(j.external_id)) return false
      seen.add(j.external_id)
      return true
    })

    // Save in batches of 50
    let saved = 0
    for (let i = 0; i < unique.length; i += 50) {
      const { error } = await supabase
        .from("jobs")
        .upsert(unique.slice(i, i+50), { onConflict: "external_id", ignoreDuplicates: false })
      if (!error) saved += Math.min(50, unique.length-i)
      else console.error("upsert error:", error.message)
    }

    return NextResponse.json({
      success: true,
      count: saved,
      query,
      country: countryCode,
      message: `✓ Found ${saved} "${query}" jobs in ${countryName}`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}