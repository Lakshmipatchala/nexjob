import { NormalizedJob, FetchContext, cleanHtml, detectWorkMode, detectJobType, keywordMatch } from "./types"

// Arbeitnow — EU remote & visa-sponsored jobs, free public JSON API
export async function fetchArbeitnow(ctx: FetchContext): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

  try {
    // Arbeitnow paginates — fetch first 3 pages
    for (let page = 1; page <= 3; page++) {
      const res = await fetch(
        `https://www.arbeitnow.com/api/job-board-api?page=${page}`,
        { cache: "no-store" }
      )
      if (!res.ok) break

      const data = await res.json()
      const jobs = data.data || []
      if (!jobs.length) break

      for (const j of jobs) {
        if (!j.title) continue
        if (!keywordMatch(`${j.title} ${j.description || ""}`, ctx.query)) continue

        const loc = j.location || "Europe"

        raw.push({
          title: j.title,
          company: j.company_name || "Unknown",
          company_logo: null,
          location: loc,
          work_mode: j.remote ? "remote" : detectWorkMode(j.title, loc, j.description || ""),
          job_type: detectJobType(j.job_types?.join(" ") || ""),
          salary_min: null,
          salary_max: null,
          source: "arbeitnow",
          source_url: j.url || "",
          description: cleanHtml(j.description || ""),
          external_id: `arbeitnow_${j.slug}`,
          posted_at: j.created_at ? new Date(j.created_at * 1000).toISOString() : ctx.now,
          is_active: true,
          expires_at: ctx.expires,
        })
      }
    }
  } catch (e) {
    console.error("Arbeitnow error:", e)
  }

  return raw
}
