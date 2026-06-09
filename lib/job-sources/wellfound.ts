import { NormalizedJob, FetchContext, cleanHtml, detectWorkMode, detectJobType } from "./types"

// Wellfound (AngelList Talent) public job listings API
// Requires WELLFOUND_API_KEY (Bearer token from Wellfound developer settings)
export async function fetchWellfound(ctx: FetchContext): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []
  if (!process.env.WELLFOUND_API_KEY) return raw

  try {
    const res = await fetch(
      `https://api.wellfound.com/v1/job_listings?q=${encodeURIComponent(ctx.query)}&per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${process.env.WELLFOUND_API_KEY}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    )

    if (!res.ok) return raw

    const data = await res.json()

    for (const j of data.job_listings || data.data || []) {
      if (!j.title) continue

      const loc = j.locations?.map((l: any) => l.display_name || l.city).join(", ") || "Remote"

      raw.push({
        title: j.title,
        company: j.startup?.name || j.company?.name || "Unknown",
        company_logo: j.startup?.logo_url || j.company?.logo_url || null,
        location: loc,
        work_mode: detectWorkMode(j.title, loc, j.description),
        job_type: detectJobType(j.job_type || ""),
        salary_min: j.compensation?.min || null,
        salary_max: j.compensation?.max || null,
        source: "wellfound",
        source_url: j.remote_ok ? j.apply_url : `https://wellfound.com/jobs/${j.id}`,
        description: cleanHtml(j.description),
        external_id: `wellfound_${j.id}`,
        posted_at: j.created_at || ctx.now,
        is_active: true,
        expires_at: ctx.expires,
      })
    }
  } catch (e) {
    console.error("Wellfound error:", e)
  }

  return raw
}
