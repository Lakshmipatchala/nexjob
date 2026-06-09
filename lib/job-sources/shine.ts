import { NormalizedJob, FetchContext, cleanHtml, detectWorkMode, detectJobType, keywordMatch } from "./types"

// Shine.com — major Indian job board, public JSON API
export async function fetchShine(ctx: FetchContext): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

  if (!ctx.countries.includes("IN") && !ctx.countries.includes("GLOBAL")) {
    return raw
  }

  try {
    const res = await fetch(
      `https://www.shine.com/api/search/?q=${encodeURIComponent(ctx.query)}&limit=50&page=1`,
      {
        headers: { "Accept": "application/json" },
        cache: "no-store",
      }
    )
    if (!res.ok) return raw

    const data = await res.json()

    for (const j of data.results || data.jobs || []) {
      const title = j.designation || j.title
      if (!title) continue
      if (!keywordMatch(`${title} ${j.description || ""}`, ctx.query)) continue

      const loc = [j.location, "India"].filter(Boolean).join(", ")

      raw.push({
        title,
        company: j.company || j.company_name || "Unknown",
        company_logo: null,
        location: loc,
        work_mode: detectWorkMode(title, loc, j.description || j.key_skills || ""),
        job_type: detectJobType(j.employment_type || j.job_type || ""),
        salary_min: j.min_salary || null,
        salary_max: j.max_salary || null,
        source: "shine",
        source_url: j.url || j.job_url || `https://www.shine.com/job-search/${j.id}`,
        description: cleanHtml(j.description || j.job_description || ""),
        external_id: `shine_${j.id || j.job_id}`,
        posted_at: j.updated_on || j.posted_on || ctx.now,
        is_active: true,
        expires_at: ctx.expires,
      })
    }
  } catch (e) {
    console.error("Shine error:", e)
  }

  return raw
}
