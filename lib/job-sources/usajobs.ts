import { NormalizedJob, FetchContext, cleanHtml } from "./types"

// USAJobs is the official US federal government jobs portal — free API, requires registration
// Register at: https://developer.usajobs.gov/
export async function fetchUSAJobs(ctx: FetchContext): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

  if (!process.env.USAJOBS_API_KEY || !process.env.USAJOBS_EMAIL) return raw
  if (!ctx.countries.includes("US") && !ctx.countries.includes("GLOBAL")) return raw

  try {
    const url =
      `https://data.usajobs.gov/api/search` +
      `?Keyword=${encodeURIComponent(ctx.query)}` +
      `&ResultsPerPage=100` +
      `&SortField=OpenDate&SortDirection=Desc`

    const res = await fetch(url, {
      headers: {
        "Host": "data.usajobs.gov",
        "User-Agent": process.env.USAJOBS_EMAIL,
        "Authorization-Key": process.env.USAJOBS_API_KEY,
      },
      cache: "no-store",
    })

    if (!res.ok) return raw

    const data = await res.json()
    const jobs = data.SearchResult?.SearchResultItems || []

    for (const item of jobs) {
      const j = item.MatchedObjectDescriptor
      if (!j) continue

      const title = j.PositionTitle
      if (!title) continue

      const loc = j.PositionLocationDisplay || j.PositionLocation?.[0]?.LocationName || "United States"
      const salaryMin = parseFloat(j.PositionRemuneration?.[0]?.MinimumRange || "0") || null
      const salaryMax = parseFloat(j.PositionRemuneration?.[0]?.MaximumRange || "0") || null

      raw.push({
        title,
        company: j.OrganizationName || j.DepartmentName || "US Federal Government",
        company_logo: null,
        location: loc,
        work_mode: "onsite",
        job_type: "full_time",
        salary_min: salaryMin,
        salary_max: salaryMax,
        source: "usajobs",
        source_url: j.ApplyURI?.[0] || j.PositionURI || "",
        description: cleanHtml(j.UserArea?.Details?.JobSummary || j.QualificationSummary || ""),
        external_id: `usajobs_${j.PositionID}`,
        posted_at: j.PublicationStartDate || ctx.now,
        is_active: true,
        expires_at: ctx.expires,
      })
    }
  } catch (e) {
    console.error("USAJobs error:", e)
  }

  return raw
}
