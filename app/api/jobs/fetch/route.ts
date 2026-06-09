import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

type Job = {
  title: string
  company: string
  company_logo: string | null
  location: string
  work_mode: "remote" | "hybrid" | "onsite"
  job_type: "full_time" | "part_time" | "contract"
  salary_min: number | null
  salary_max: number | null
  source: string
  source_url: string
  description: string
  external_id: string
  posted_at: string
  is_active: boolean
  expires_at: string
}

const GLOBAL_COUNTRIES = ["US", "CA", "GB", "IN", "AU", "DE", "SG", "AE", "NL", "FR"]

const countryNames: Record<string, string> = {
  US: "United States",
  IN: "India",
  GB: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  DE: "Germany",
  SG: "Singapore",
  AE: "UAE",
  NL: "Netherlands",
  FR: "France",
  GLOBAL: "Worldwide",
  REMOTE: "Remote",
}

function cleanHtml(value?: string) {
  return (value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000)
}

function detectWorkMode(title = "", location = "", description = ""): "remote" | "hybrid" | "onsite" {
  const text = `${title} ${location} ${description}`.toLowerCase()
  if (text.includes("remote")) return "remote"
  if (text.includes("hybrid")) return "hybrid"
  return "onsite"
}

function detectJobType(value = ""): "full_time" | "part_time" | "contract" {
  const text = value.toLowerCase()
  if (text.includes("part")) return "part_time"
  if (text.includes("contract") || text.includes("temporary") || text.includes("corp")) return "contract"
  return "full_time"
}

function keywordMatch(job: any, query: string) {
  const q = query.toLowerCase().trim()
  const text = `${job.title || ""} ${job.jobTitle || ""} ${job.text || ""} ${job.description || ""} ${job.content || ""} ${job.descriptionPlain || ""}`.toLowerCase()

  return q
    .split(/\s+/)
    .filter(Boolean)
    .some(word => text.includes(word))
}

async function fetchJSearch(query: string, countries: string[], now: string, expires: string) {
  const raw: Job[] = []
  if (!process.env.RAPIDAPI_KEY) return raw

  for (const c of countries) {
    const countryName = countryNames[c] || c
    const jsearchCountry = c.toLowerCase()

    for (let page = 1; page <= 3; page++) {
      try {
        const url =
          `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=1&page=${page}&country=${jsearchCountry}`

        const res = await fetch(url, {
          headers: {
            "x-rapidapi-host": "jsearch.p.rapidapi.com",
            "x-rapidapi-key": process.env.RAPIDAPI_KEY,
          },
          cache: "no-store",
        })

        if (!res.ok) {
          console.error("JSearch HTTP error:", res.status, await res.text())
          break
        }

        const data = await res.json()
        const jobs = data.data || []
        if (!jobs.length) break

        for (const j of jobs) {
          if (!j.job_title) continue

          const loc = j.job_city
            ? `${j.job_city}, ${j.job_state || j.job_country || countryName}`
            : j.job_is_remote
              ? "Remote"
              : countryName

          raw.push({
            title: j.job_title,
            company: j.employer_name || "Unknown",
            company_logo: j.employer_logo || null,
            location: loc,
            work_mode: detectWorkMode(j.job_title, loc, j.job_description),
            job_type: detectJobType(j.job_employment_type || ""),
            salary_min: j.job_min_salary || null,
            salary_max: j.job_max_salary || null,
            source: j.job_publisher?.toLowerCase().includes("linkedin")
              ? "linkedin"
              : j.job_publisher?.toLowerCase().includes("indeed")
                ? "indeed"
                : j.job_publisher?.toLowerCase().includes("glassdoor")
                  ? "glassdoor"
                  : j.job_publisher?.toLowerCase().includes("dice")
                    ? "dice"
                    : j.job_publisher?.toLowerCase().includes("monster")
                      ? "monster"
                      : j.job_publisher?.toLowerCase().includes("zip")
                        ? "ziprecruiter"
                        : j.job_publisher?.toLowerCase().includes("naukri")
                          ? "naukri"
                          : "jsearch",
            source_url: j.job_apply_link || "",
            description: cleanHtml(j.job_description),
            external_id: `jsearch_${j.job_id}`,
            posted_at: j.job_posted_at_datetime_utc || now,
            is_active: true,
            expires_at: expires,
          })
        }
      } catch (e) {
        console.error("JSearch error:", e)
      }
    }
  }

  return raw
}

async function fetchRemotive(query: string, now: string, expires: string) {
  const raw: Job[] = []

  try {
    const res = await fetch(
      `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=100`,
      { cache: "no-store" }
    )

    if (!res.ok) return raw

    const data = await res.json()

    for (const j of data.jobs || []) {
      if (!j.title) continue

      raw.push({
        title: j.title,
        company: j.company_name || "Unknown",
        company_logo: j.company_logo || null,
        location: j.candidate_required_location || "Remote Worldwide",
        work_mode: "remote",
        job_type: "full_time",
        salary_min: null,
        salary_max: null,
        source: "remotive",
        source_url: j.url || "",
        description: cleanHtml(j.description),
        external_id: `remotive_${j.id}`,
        posted_at: j.publication_date || now,
        is_active: true,
        expires_at: expires,
      })
    }
  } catch (e) {
    console.error("Remotive error:", e)
  }

  return raw
}

async function fetchJobicy(query: string, now: string, expires: string) {
  const raw: Job[] = []

  try {
    const tag = query.split(" ")[0].toLowerCase()

    const res = await fetch(
      `https://jobicy.com/api/v2/remote-jobs?count=100&tag=${encodeURIComponent(tag)}`,
      { cache: "no-store" }
    )

    if (!res.ok) return raw

    const data = await res.json()

    for (const j of data.jobs || []) {
      if (!j.jobTitle) continue

      raw.push({
        title: j.jobTitle,
        company: j.companyName || "Unknown",
        company_logo: j.companyLogo || null,
        location: j.jobGeo || "Remote Worldwide",
        work_mode: "remote",
        job_type: detectJobType(j.jobType || ""),
        salary_min: null,
        salary_max: null,
        source: "jobicy",
        source_url: j.url || "",
        description: cleanHtml(j.jobExcerpt),
        external_id: `jobicy_${j.id}`,
        posted_at: j.pubDate || now,
        is_active: true,
        expires_at: expires,
      })
    }
  } catch (e) {
    console.error("Jobicy error:", e)
  }

  return raw
}

async function fetchAdzuna(query: string, countries: string[], now: string, expires: string) {
  const raw: Job[] = []

  if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) return raw

  const map: Record<string, string> = {
    US: "us",
    IN: "in",
    GB: "gb",
    CA: "ca",
    AU: "au",
    DE: "de",
    SG: "sg",
    AE: "ae",
    NL: "nl",
    FR: "fr",
  }

  for (const c of countries) {
    const ac = map[c]
    if (!ac) continue

    for (let page = 1; page <= 3; page++) {
      try {
        const url =
          `https://api.adzuna.com/v1/api/jobs/${ac}/search/${page}` +
          `?app_id=${process.env.ADZUNA_APP_ID}` +
          `&app_key=${process.env.ADZUNA_APP_KEY}` +
          `&what=${encodeURIComponent(query)}` +
          `&results_per_page=50`

        const res = await fetch(url, { cache: "no-store" })
        if (!res.ok) break

        const data = await res.json()
        const jobs = data.results || []
        if (!jobs.length) break

        for (const j of jobs) {
          if (!j.title) continue

          const loc = j.location?.display_name || countryNames[c] || c

          raw.push({
            title: j.title,
            company: j.company?.display_name || "Unknown",
            company_logo: null,
            location: loc,
            work_mode: detectWorkMode(j.title, loc, j.description),
            job_type: detectJobType(j.contract_time || ""),
            salary_min: j.salary_min || null,
            salary_max: j.salary_max || null,
            source: "adzuna",
            source_url: j.redirect_url || "",
            description: cleanHtml(j.description),
            external_id: `adzuna_${j.id}`,
            posted_at: j.created || now,
            is_active: true,
            expires_at: expires,
          })
        }
      } catch (e) {
        console.error("Adzuna error:", e)
      }
    }
  }

  return raw
}

async function fetchGreenhouse(query: string, now: string, expires: string) {
  const raw: Job[] = []

  const companies = [
    "stripe", "anthropic", "databricks", "snowflake", "confluent", "mongodb",
    "elastic", "cloudflare", "datadog", "github", "gitlab", "twilio",
    "figma", "notion", "vercel", "brex", "plaid", "rippling", "airtable",
    "canva", "miro", "deel", "hashicorp", "coinbase", "robinhood", "gusto",
  ]

  for (const company of companies) {
    try {
      const res = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`,
        { cache: "no-store" }
      )

      if (!res.ok) continue

      const data = await res.json()

      for (const j of data.jobs || []) {
        if (!j.title || !keywordMatch(j, query)) continue

        const loc = j.location?.name || "Remote / Worldwide"

        raw.push({
          title: j.title,
          company: company.charAt(0).toUpperCase() + company.slice(1),
          company_logo: null,
          location: loc,
          work_mode: detectWorkMode(j.title, loc, j.content),
          job_type: "full_time",
          salary_min: null,
          salary_max: null,
          source: "greenhouse",
          source_url: j.absolute_url || "",
          description: cleanHtml(j.content),
          external_id: `greenhouse_${j.id}`,
          posted_at: j.updated_at || now,
          is_active: true,
          expires_at: expires,
        })
      }
    } catch (e) {
      console.error("Greenhouse error:", company, e)
    }
  }

  return raw
}

async function fetchLever(query: string, now: string, expires: string) {
  const raw: Job[] = []

  const companies = [
    "netflix", "uber", "lyft", "reddit", "duolingo", "carta", "rippling",
    "clickup", "miro", "loom", "benchling", "scale", "deel", "coinbase",
    "chime", "gusto", "greenhouse", "brex", "intercom",
  ]

  for (const company of companies) {
    try {
      const res = await fetch(
        `https://api.lever.co/v0/postings/${company}?mode=json`,
        { cache: "no-store" }
      )

      if (!res.ok) continue

      const jobs = await res.json()

      for (const j of Array.isArray(jobs) ? jobs : []) {
        if (!j.text || !keywordMatch(j, query)) continue

        const loc = j.categories?.location || "Remote / Worldwide"

        raw.push({
          title: j.text,
          company: company.charAt(0).toUpperCase() + company.slice(1),
          company_logo: null,
          location: loc,
          work_mode: detectWorkMode(j.text, loc, j.descriptionPlain),
          job_type: "full_time",
          salary_min: null,
          salary_max: null,
          source: "lever",
          source_url: j.hostedUrl || "",
          description: cleanHtml(j.descriptionPlain),
          external_id: `lever_${j.id}`,
          posted_at: j.createdAt ? new Date(j.createdAt).toISOString() : now,
          is_active: true,
          expires_at: expires,
        })
      }
    } catch (e) {
      console.error("Lever error:", company, e)
    }
  }

  return raw
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const query = searchParams.get("query") || "software engineer"
    const countryParam = (searchParams.get("country") || "GLOBAL").toUpperCase()

    const countries =
      countryParam === "GLOBAL" || countryParam === "ALL" || countryParam === "WORLDWIDE"
        ? GLOBAL_COUNTRIES
        : countryParam === "REMOTE"
          ? GLOBAL_COUNTRIES
          : [countryParam]

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    const raw: Job[] = []
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const now = new Date().toISOString()

    const results = await Promise.allSettled([
      fetchJSearch(query, countries, now, expires),
      fetchAdzuna(query, countries, now, expires),
      fetchRemotive(query, now, expires),
      fetchJobicy(query, now, expires),
      fetchGreenhouse(query, now, expires),
      fetchLever(query, now, expires),
    ])

    for (const result of results) {
      if (result.status === "fulfilled") raw.push(...result.value)
    }

    const seen = new Set<string>()

    const unique = raw.filter(job => {
      if (!job.external_id || !job.source_url) return false

      const key = `${job.source}_${job.external_id}`

      if (seen.has(key)) return false

      seen.add(key)
      return true
    })

    let saved = 0

    for (let i = 0; i < unique.length; i += 50) {
      const batch = unique.slice(i, i + 50)

      const { error } = await supabase
        .from("jobs")
        .upsert(batch, {
          onConflict: "external_id",
          ignoreDuplicates: false,
        })

      if (error) {
        console.error("Supabase upsert error:", error.message)
      } else {
        saved += batch.length
      }
    }

    return NextResponse.json({
      success: true,
      query,
      country: countryParam,
      countries_searched: countries,
      total_found: unique.length,
      count: saved,
      message: `Fetched ${saved} jobs for "${query}" from global + remote sources.`,
    })
  } catch (err: any) {
    console.error("Fetch route error:", err)

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Unknown server error",
      },
      { status: 500 }
    )
  }
}