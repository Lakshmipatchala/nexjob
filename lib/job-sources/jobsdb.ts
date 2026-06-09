import { NormalizedJob, FetchContext, cleanHtml, detectWorkMode, detectJobType, keywordMatch } from "./types"

// JobsDB — leading job board across Asia-Pacific, public JSON API
const JOBSDB_SITES: Array<{ site: string; country: string; code: string }> = [
  { site: "sg", country: "Singapore", code: "SG" },
  { site: "hk", country: "Hong Kong", code: "HK" },
  { site: "th", country: "Thailand", code: "TH" },
  { site: "id", country: "Indonesia", code: "ID" },
  { site: "ph", country: "Philippines", code: "PH" },
  { site: "my", country: "Malaysia", code: "MY" },
]

export async function fetchJobsDB(ctx: FetchContext): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

  const targets = JOBSDB_SITES.filter(s =>
    ctx.countries.includes(s.code) || ctx.countries.includes("GLOBAL")
  )
  const sites = targets.length > 0 ? targets : JOBSDB_SITES.slice(0, 3)

  for (const site of sites) {
    try {
      const res = await fetch(
        `https://xapi.supercharge-srp.co/job-search/graphql?country=${site.site}&isDesktop=true`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            query: `query getJobs($keyword: String, $country: String, $pageSize: Int) {
              jobs(
                country: $country
                keyword: $keyword
                pageSize: $pageSize
                pageNumber: 1
              ) {
                total
                jobs {
                  id
                  title
                  companyName
                  companyLogo
                  location { city }
                  salary { min max currency }
                  workType
                  postedAt
                  jobUrl
                  snippet
                }
              }
            }`,
            variables: {
              keyword: ctx.query,
              country: site.site,
              pageSize: 50,
            },
          }),
          cache: "no-store",
        }
      )
      if (!res.ok) continue

      const data = await res.json()
      const jobs = data.data?.jobs?.jobs || []

      for (const j of jobs) {
        if (!j.title) continue
        if (!keywordMatch(`${j.title} ${j.snippet || ""}`, ctx.query)) continue

        const loc = [j.location?.city, site.country].filter(Boolean).join(", ")

        raw.push({
          title: j.title,
          company: j.companyName || "Unknown",
          company_logo: j.companyLogo || null,
          location: loc,
          work_mode: detectWorkMode(j.title, loc, j.snippet || ""),
          job_type: detectJobType(j.workType || ""),
          salary_min: j.salary?.min || null,
          salary_max: j.salary?.max || null,
          source: "jobsdb",
          source_url: j.jobUrl || `https://hk.jobsdb.com/job/${j.id}`,
          description: cleanHtml(j.snippet || ""),
          external_id: `jobsdb_${j.id}`,
          posted_at: j.postedAt || ctx.now,
          is_active: true,
          expires_at: ctx.expires,
        })
      }
    } catch (e) {
      console.error("JobsDB error:", site.site, e)
    }
  }

  return raw
}
