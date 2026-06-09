import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  NormalizedJob,
  FetchContext,
  cleanHtml,
  detectWorkMode,
  detectJobType,
  keywordMatch,
  COUNTRY_NAMES,
  ADZUNA_COUNTRY_MAP,
  fetchJooble,
  fetchRemoteOK,
  fetchWeWorkRemotely,
  fetchHimalayas,
  fetchWellfound,
  fetchDice,
  fetchUSAJobs,
  fetchAshby,
  fetchWorkable,
  fetchSmartRecruiters,
  fetchBambooHR,
  fetchJobvite,
  fetchBayt,
  fetchGulfTalent,
  fetchNaukri,
  fetchShine,
  fetchEURES,
  fetchJobsDB,
} from "@/lib/job-sources"

// Countries covered across all sources
const GLOBAL_COUNTRIES = [
  // Core English-speaking
  "US", "CA", "GB", "AU", "IE",
  // Asia-Pacific
  "IN", "SG", "JP", "KR", "HK", "TH", "ID", "PH", "MY",
  // Middle East
  "AE", "KW", "SA", "QA", "BH", "OM", "EG", "JO",
  // Western Europe
  "DE", "FR", "NL", "SE", "NO", "DK", "FI", "CH", "AT", "BE", "PT", "ES", "IT",
  // Eastern Europe
  "PL", "CZ", "RO", "HU",
  // Americas
  "BR", "MX",
  // Africa
  "ZA", "NG",
]

// ── Existing source fetchers (kept inline, use shared helpers) ─────────────

async function fetchJSearch(query: string, countries: string[], now: string, expires: string): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []
  if (!process.env.RAPIDAPI_KEY) return raw

  // JSearch supports these country codes
  const supported = new Set(["us","ca","gb","in","au","de","sg","ae","nl","fr","it","es","pl","se","no","dk","fi","ch","at","be","pt","ie","br","mx","za","jp","kr","sa","qa","bh","om","kw"])

  for (const c of countries) {
    const jsearchCountry = c.toLowerCase()
    if (!supported.has(jsearchCountry)) continue

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

        if (!res.ok) break

        const data = await res.json()
        const jobs = data.data || []
        if (!jobs.length) break

        for (const j of jobs) {
          if (!j.job_title) continue

          const loc = j.job_city
            ? `${j.job_city}, ${j.job_state || j.job_country || COUNTRY_NAMES[c] || c}`
            : j.job_is_remote
              ? "Remote"
              : COUNTRY_NAMES[c] || c

          raw.push({
            title: j.job_title,
            company: j.employer_name || "Unknown",
            company_logo: j.employer_logo || null,
            location: loc,
            work_mode: detectWorkMode(j.job_title, loc, j.job_description),
            job_type: detectJobType(j.job_employment_type || ""),
            salary_min: j.job_min_salary || null,
            salary_max: j.job_max_salary || null,
            source: normalizeJSearchPublisher(j.job_publisher),
            source_url: j.job_apply_link || "",
            description: cleanHtml(j.job_description),
            external_id: `jsearch_${j.job_id}`,
            posted_at: j.job_posted_at_datetime_utc || now,
            is_active: true,
            expires_at: expires,
          })
        }
      } catch (e) {
        console.error("JSearch error:", c, e)
      }
    }
  }

  return raw
}

function normalizeJSearchPublisher(pub?: string): string {
  if (!pub) return "jsearch"
  const p = pub.toLowerCase()
  if (p.includes("linkedin")) return "linkedin"
  if (p.includes("indeed")) return "indeed"
  if (p.includes("glassdoor")) return "glassdoor"
  if (p.includes("dice")) return "dice"
  if (p.includes("monster")) return "monster"
  if (p.includes("zip")) return "ziprecruiter"
  if (p.includes("naukri")) return "naukri"
  if (p.includes("bayt")) return "bayt"
  if (p.includes("gulf")) return "gulfjobs"
  return "jsearch"
}

async function fetchRemotive(query: string, now: string, expires: string): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

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

async function fetchJobicy(query: string, now: string, expires: string): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

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

async function fetchAdzuna(query: string, countries: string[], now: string, expires: string): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []
  if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) return raw

  for (const c of countries) {
    const ac = ADZUNA_COUNTRY_MAP[c]
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

          const loc = j.location?.display_name || COUNTRY_NAMES[c] || c

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
        console.error("Adzuna error:", c, e)
      }
    }
  }

  return raw
}

async function fetchGreenhouse(query: string, now: string, expires: string): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

  const companies = [
    "stripe", "anthropic", "databricks", "snowflake", "confluent", "mongodb",
    "elastic", "cloudflare", "datadog", "github", "gitlab", "twilio",
    "figma", "notion", "vercel", "brex", "plaid", "rippling", "airtable",
    "canva", "miro", "deel", "hashicorp", "coinbase", "robinhood", "gusto",
    // Added in Phase 1
    "openai", "mistral", "huggingface", "cohere", "scale-ai", "weights-biases",
    "linear", "loom", "retool", "render", "fly", "supabase", "neon",
    "dbt-labs", "airbyte", "fivetran", "segment", "amplitude", "mixpanel",
    "intercom", "zendesk", "freshworks", "hubspot", "lattice", "culture-amp",
    "remote", "deel", "papaya-global", "oyster-hr",
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
        if (!j.title || !keywordMatch(`${j.title} ${j.content || ""}`, query)) continue

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

async function fetchLever(query: string, now: string, expires: string): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

  const companies = [
    "netflix", "uber", "lyft", "reddit", "duolingo", "carta", "rippling",
    "clickup", "miro", "loom", "benchling", "scale", "deel", "coinbase",
    "chime", "gusto", "greenhouse", "brex", "intercom",
    // Added in Phase 1
    "figma", "notion", "airtable", "coda", "craft", "linear",
    "replit", "sourcegraph", "vercel", "netlify", "fly-io",
    "stripe", "plaid", "checkout", "adyen", "marqeta",
    "palantir", "anduril", "shield-ai", "scale-ai",
    "ramp", "brex", "mercury", "modern-treasury",
    "hinge", "bumble", "match", "bereal",
    "calm", "headspace", "noom", "tempus",
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
        if (!j.text || !keywordMatch(`${j.text} ${j.descriptionPlain || ""}`, query)) continue

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

// Cross-source dedup fingerprint
function contentFingerprint(title: string, company: string, location: string): string {
  const s = `${title}|${company}|${location}`.toLowerCase().replace(/[^a-z0-9|]/g, "")
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h).toString(36)
}

// ── Main route handler ──────────────────────────────────────────────────────

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

    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const now = new Date().toISOString()

    const ctx: FetchContext = { query, countries, now, expires }

    // Run all sources in parallel — failures are isolated
    const results = await Promise.allSettled([
      // Existing aggregators
      fetchJSearch(query, countries, now, expires),
      fetchAdzuna(query, countries, now, expires),
      fetchRemotive(query, now, expires),
      fetchJobicy(query, now, expires),
      // Existing ATS scrapers
      fetchGreenhouse(query, now, expires),
      fetchLever(query, now, expires),
      // Phase 1 — New sources
      fetchJooble(ctx),
      fetchRemoteOK(ctx),
      fetchWeWorkRemotely(ctx),
      fetchHimalayas(ctx),
      fetchWellfound(ctx),
      fetchDice(ctx),
      fetchUSAJobs(ctx),
      // Phase 2 — ATS platforms
      fetchAshby(ctx),
      fetchWorkable(ctx),
      fetchSmartRecruiters(ctx),
      fetchBambooHR(ctx),
      fetchJobvite(ctx),
      // Phase 3 — Regional boards
      fetchBayt(ctx),
      fetchGulfTalent(ctx),
      fetchNaukri(ctx),
      fetchShine(ctx),
      fetchEURES(ctx),
      fetchJobsDB(ctx),
    ])

    const raw: NormalizedJob[] = []
    const sourceStats: Record<string, number> = {}

    for (const result of results) {
      if (result.status === "fulfilled") {
        raw.push(...result.value)
        for (const job of result.value) {
          sourceStats[job.source] = (sourceStats[job.source] || 0) + 1
        }
      }
    }

    // Deduplicate by external_id, then by content hash (cross-source)
    const seen = new Set<string>()
    const contentSeen = new Set<string>()
    const unique = raw.filter(job => {
      if (!job.external_id || !job.source_url) return false
      const key = `${job.source}_${job.external_id}`
      if (seen.has(key)) return false
      seen.add(key)
      // Cross-source dedup: skip if same title+company+location already queued
      const hash = contentFingerprint(job.title, job.company, job.location)
      if (contentSeen.has(hash)) return false
      contentSeen.add(hash)
      return true
    })

    let saved = 0
    for (let i = 0; i < unique.length; i += 50) {
      const batch = unique.slice(i, i + 50)
      const { error } = await supabase
        .from("jobs")
        .upsert(batch, { onConflict: "external_id", ignoreDuplicates: false })

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
      saved,
      sources: sourceStats,
      message: `Fetched ${saved} jobs for "${query}" across ${countries.length} countries from ${Object.keys(sourceStats).length} sources.`,
    })
  } catch (err: any) {
    console.error("Fetch route error:", err)
    return NextResponse.json({ success: false, error: err.message || "Unknown server error" }, { status: 500 })
  }
}
