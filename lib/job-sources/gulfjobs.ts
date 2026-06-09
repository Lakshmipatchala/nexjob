import { NormalizedJob, FetchContext, cleanHtml, detectWorkMode, detectJobType, keywordMatch } from "./types"

// GulfTalent — covers Gulf + broader Middle East, public JSON API
export async function fetchGulfTalent(ctx: FetchContext): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

  const GULF_COUNTRIES = ["ae", "sa", "kw", "qa", "bh", "om", "eg", "jo", "lb", "in", "pk"]
  const active = GULF_COUNTRIES.filter(c => ctx.countries.some(cc => cc.toLowerCase() === c))
  const targets = active.length > 0 ? active : GULF_COUNTRIES.slice(0, 6)

  for (const country of targets) {
    try {
      const res = await fetch(
        `https://www.gulftalent.com/api/jobs/search?keywords=${encodeURIComponent(ctx.query)}&country=${country}&page=1&per_page=50`,
        {
          headers: { "Accept": "application/json" },
          cache: "no-store",
        }
      )
      if (!res.ok) continue

      const data = await res.json()

      for (const j of data.jobs || data.data || []) {
        const title = j.title || j.job_title
        if (!title) continue
        if (!keywordMatch(`${title} ${j.description || ""}`, ctx.query)) continue

        const loc = [j.city, j.country_name || country.toUpperCase()].filter(Boolean).join(", ")

        raw.push({
          title,
          company: j.company?.name || j.company_name || "Unknown",
          company_logo: j.company?.logo || null,
          location: loc,
          work_mode: detectWorkMode(title, loc, j.description || ""),
          job_type: detectJobType(j.job_type || j.employment_type || ""),
          salary_min: j.salary_min || null,
          salary_max: j.salary_max || null,
          source: "gulftalent",
          source_url: j.url || j.apply_url || `https://www.gulftalent.com/jobs/${j.id}`,
          description: cleanHtml(j.description || j.summary || ""),
          external_id: `gulftalent_${j.id}`,
          posted_at: j.posted_at || j.created_at || ctx.now,
          is_active: true,
          expires_at: ctx.expires,
        })
      }
    } catch (e) {
      console.error("GulfTalent error:", country, e)
    }
  }

  return raw
}
