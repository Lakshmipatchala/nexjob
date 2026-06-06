import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const US_PATTERNS = [
  "united states"," us)"," us,",", us","usa","u.s.",
  ", al",", ak",", az",", ar",", ca",", co",", ct",", de",
  ", fl",", ga",", hi",", id",", il",", in",", ia",", ks",
  ", ky",", la",", me",", md",", ma",", mi",", mn",", ms",
  ", mo",", mt",", ne",", nv",", nh",", nj",", nm",", ny",
  ", nc",", nd",", oh",", ok",", or",", pa",", ri",", sc",
  ", sd",", tn",", tx",", ut",", vt",", va",", wa",", wv",
  ", wi",", wy",", dc",
  "new york","san francisco","los angeles","chicago","seattle",
  "boston","austin","denver","atlanta","dallas","houston",
  "phoenix","philadelphia","san diego","san jose","portland",
  "nashville","las vegas","raleigh","miami","minneapolis",
  "detroit","memphis","louisville","baltimore","milwaukee"
]

const NON_US = [
  "india","bengaluru","bangalore","mumbai","delhi","hyderabad","pune","chennai","kolkata","gurugram","noida",
  "canada","toronto","vancouver","montreal","ottawa","calgary",
  "united kingdom","london","manchester","edinburgh","birmingham",
  "australia","sydney","melbourne","brisbane","perth",
  "germany","berlin","munich","frankfurt","hamburg",
  "france","paris","lyon","japan","tokyo","osaka",
  "china","beijing","shanghai","shenzhen",
  "brazil","sao paulo","mexico",
  "israel","tel aviv","ireland","dublin",
  "netherlands","amsterdam","spain","madrid","barcelona",
  "italy","rome","milan","poland","warsaw",
  "sweden","stockholm","denmark","copenhagen",
  "norway","oslo","finland","helsinki",
  "singapore","hong kong","taiwan","south korea","seoul",
  "new zealand","south africa","argentina","colombia",
  "nigeria","kenya","pakistan","bangladesh","philippines",
  "indonesia","malaysia","thailand","vietnam",
  "uae","dubai","saudi","egypt","turkey",
  "switzerland","austria","belgium","portugal",
  "czech","romania","hungary","apac","emea","latam","apj"
]

function valid(title: string, location: string, isRemote: boolean): boolean {
  if (!title?.trim()) return false
  if (title.includes("(m/w/d)") || title.includes("(m/f/d)")) return false
  if (isRemote) return true
  const loc = location.toLowerCase()
  if (NON_US.some(p => loc.includes(p))) return false
  return US_PATTERNS.some(p => loc.includes(p))
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query") || "software engineer"
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)
    const raw: any[] = []

    // JSearch - LinkedIn/Indeed/Glassdoor/Dice US
    try {
      const res = await fetch(
        `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query + " United States")}&num_pages=5&country=us&date_posted=week`,
        { headers: { "x-rapidapi-host": "jsearch.p.rapidapi.com", "x-rapidapi-key": process.env.RAPIDAPI_KEY! } }
      )
      const data = await res.json()
      for (const j of (data.data || [])) {
        const isRemote = j.job_is_remote === true
        const loc = j.job_city ? `${j.job_city}, ${j.job_state || "US"}` : isRemote ? "Remote" : "United States"
        if (!valid(j.job_title, loc, isRemote)) continue
        raw.push({
          title: j.job_title, company: j.employer_name, company_logo: j.employer_logo,
          location: loc, work_mode: isRemote ? "remote" : "onsite",
          job_type: j.job_employment_type?.toLowerCase().includes("full") ? "full_time" : "contract",
          salary_min: j.job_min_salary || null, salary_max: j.job_max_salary || null,
          source: j.job_publisher?.toLowerCase().includes("linkedin") ? "linkedin"
            : j.job_publisher?.toLowerCase().includes("indeed") ? "indeed"
            : j.job_publisher?.toLowerCase().includes("glassdoor") ? "glassdoor"
            : j.job_publisher?.toLowerCase().includes("dice") ? "dice" : "other",
          source_url: j.job_apply_link,
          description: j.job_description?.slice(0, 5000) || "",
          external_id: `jsearch_${j.job_id}`,
          posted_at: j.job_posted_at_datetime_utc || new Date().toISOString(),
          is_active: true,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
    } catch(e) { console.error("JSearch:", e) }

    // Remotive - Remote worldwide
    try {
      const res = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=50`)
      const data = await res.json()
      for (const j of (data.jobs || [])) {
        raw.push({
          title: j.title, company: j.company_name, company_logo: j.company_logo,
          location: j.candidate_required_location || "Remote (Worldwide)",
          work_mode: "remote", job_type: "full_time",
          salary_min: null, salary_max: null, source: "remotive",
          source_url: j.url,
          description: j.description?.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,5000) || "",
          external_id: `remotive_${j.id}`,
          posted_at: j.publication_date || new Date().toISOString(),
          is_active: true,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
    } catch(e) { console.error("Remotive:", e) }

    // Jobicy - Remote worldwide
    try {
      const tag = query.split(" ")[0].toLowerCase()
      const res = await fetch(`https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(tag)}`)
      const data = await res.json()
      for (const j of (data.jobs || [])) {
        if (!j.jobTitle) continue
        raw.push({
          title: j.jobTitle, company: j.companyName, company_logo: j.companyLogo || null,
          location: j.jobGeo || "Remote (Worldwide)", work_mode: "remote",
          job_type: j.jobType?.includes("full") ? "full_time" : "contract",
          salary_min: null, salary_max: null, source: "jobicy",
          source_url: j.url,
          description: j.jobExcerpt?.slice(0,5000) || "",
          external_id: `jobicy_${j.id}`,
          posted_at: j.pubDate || new Date().toISOString(),
          is_active: true,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
    } catch(e) { console.error("Jobicy:", e) }

    // Greenhouse - Top US tech companies
    try {
      const cos = ["stripe","anthropic","databricks","snowflake","confluent","mongodb","elastic","cloudflare","datadog","github","gitlab","hashicorp","twilio","figma","notion","vercel","brex","plaid","rippling","airtable"]
      const kw = query.toLowerCase()
      for (const co of cos) {
        try {
          const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${co}/jobs?content=true`)
          const data = await res.json()
          for (const j of (data.jobs||[]).filter((j:any)=>j.title?.toLowerCase().includes(kw)).slice(0,3)) {
            const loc = j.location?.name || "Remote"
            const isRemote = loc.toLowerCase().includes("remote")
            if (!valid(j.title, loc, isRemote)) continue
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
    } catch(e) { console.error("Greenhouse:", e) }

    // Lever - More US tech companies
    try {
      const cos = ["netflix","uber","lyft","reddit","duolingo","carta","rippling","airtable","canva","clickup","miro","loom","benchling","scale","deel"]
      const kw = query.toLowerCase()
      for (const co of cos) {
        try {
          const res = await fetch(`https://api.lever.co/v0/postings/${co}?mode=json`)
          const jobs = await res.json()
          for (const j of (Array.isArray(jobs)?jobs:[]).filter((j:any)=>j.text?.toLowerCase().includes(kw)).slice(0,3)) {
            const loc = j.categories?.location || "Remote"
            const isRemote = loc.toLowerCase().includes("remote")
            if (!valid(j.text, loc, isRemote)) continue
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
    } catch(e) { console.error("Lever:", e) }

    // Adzuna - US only
    if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
      try {
        const res = await fetch(`https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&what=${encodeURIComponent(query)}&results_per_page=50&max_days_old=7`)
        const data = await res.json()
        for (const j of (data.results||[])) {
          const loc = j.location?.display_name || "US"
          const isRemote = j.title?.toLowerCase().includes("remote")||loc.toLowerCase().includes("remote")
          if (!valid(j.title, loc, isRemote)) continue
          raw.push({
            title: j.title, company: j.company?.display_name||"Unknown", company_logo: null,
            location: loc, work_mode: isRemote?"remote":"onsite",
            job_type: j.contract_time==="full_time"?"full_time":"contract",
            salary_min: j.salary_min||null, salary_max: j.salary_max||null, source: "adzuna",
            source_url: j.redirect_url,
            description: j.description?.slice(0,5000)||"",
            external_id: `adzuna_${j.id}`,
            posted_at: j.created||new Date().toISOString(),
            is_active: true,
            expires_at: new Date(Date.now()+7*24*60*60*1000).toISOString(),
          })
        }
      } catch(e) { console.error("Adzuna:", e) }
    }

    // Deduplicate
    const seen = new Set()
    const unique = raw.filter(j => {
      if (!j.external_id || seen.has(j.external_id)) return false
      seen.add(j.external_id)
      return true
    })

    let saved = 0
    for (let i = 0; i < unique.length; i += 50) {
      const { error } = await supabase.from("jobs").upsert(unique.slice(i,i+50), { onConflict: "external_id", ignoreDuplicates: false })
      if (!error) saved += Math.min(50, unique.length - i)
    }

    return NextResponse.json({ success: true, count: saved, query, message: `✓ Fetched ${saved} jobs for "${query}"` })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}