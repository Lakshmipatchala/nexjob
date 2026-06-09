import { NormalizedJob, FetchContext, cleanHtml, detectWorkMode, detectJobType, keywordMatch } from "./types"

// FindWork — curated tech jobs (dev, data, design), free public JSON API
// Optional: set FINDWORK_API_KEY env var for higher rate limits
export async function fetchFindWork(ctx: FetchContext): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

  try {
    const headers: Record<string, string> = {
      "Accept": "application/json",
    }
    if (process.env.FINDWORK_API_KEY) {
      headers["Authorization"] = `Token ${process.env.FINDWORK_API_KEY}`
    }

    const res = await fetch(
      `https://findwork.dev/api/jobs/?search=${encodeURIComponent(ctx.query)}&sort_by=date`,
      { headers, cache: "no-store" }
    )
    if (!res.ok) return raw

    const data = await res.json()

    for (const j of data.results || []) {
      if (!j.role) continue
      if (!keywordMatch(`${j.role} ${j.text || ""}`, ctx.query)) continue

      const loc = j.location || (j.remote ? "Remote Worldwide" : "Unknown")

      raw.push({
        title: j.role,
        company: j.company_name || "Unknown",
        company_logo: j.company_logo || null,
        location: loc,
        work_mode: j.remote ? "remote" : detectWorkMode(j.role, loc, j.text || ""),
        job_type: detectJobType(j.employment_type || ""),
        salary_min: null,
        salary_max: null,
        source: "findwork",
        source_url: j.url || "",
        description: cleanHtml(j.text || ""),
        external_id: `findwork_${j.id}`,
        posted_at: j.date_posted || ctx.now,
        is_active: true,
        expires_at: ctx.expires,
      })
    }
  } catch (e) {
    console.error("FindWork error:", e)
  }

  return raw
}
