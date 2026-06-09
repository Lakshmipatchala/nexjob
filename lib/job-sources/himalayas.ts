import { NormalizedJob, FetchContext, cleanHtml, detectJobType } from "./types"

// Himalayas has a free public JSON jobs API
export async function fetchHimalayas(ctx: FetchContext): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

  try {
    const url = `https://himalayas.app/jobs/api?q=${encodeURIComponent(ctx.query)}&limit=100`
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return raw

    const data = await res.json()

    for (const j of data.jobs || []) {
      if (!j.title) continue

      raw.push({
        title: j.title,
        company: j.company?.name || j.companyName || "Unknown",
        company_logo: j.company?.logoUrl || null,
        location: j.locationRestrictions?.join(", ") || "Remote Worldwide",
        work_mode: "remote",
        job_type: detectJobType(j.jobType || ""),
        salary_min: j.salaryMin || null,
        salary_max: j.salaryMax || null,
        source: "himalayas",
        source_url: j.applicationLink || j.url || `https://himalayas.app/jobs/${j.slug}`,
        description: cleanHtml(j.description),
        external_id: `himalayas_${j.id || j.slug}`,
        posted_at: j.publishedAt || ctx.now,
        is_active: true,
        expires_at: ctx.expires,
      })
    }
  } catch (e) {
    console.error("Himalayas error:", e)
  }

  return raw
}
