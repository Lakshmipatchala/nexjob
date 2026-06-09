import { NormalizedJob, FetchContext, cleanHtml, keywordMatch } from "./types"

// RemoteOK has a free public JSON API — no key required
export async function fetchRemoteOK(ctx: FetchContext): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

  try {
    const res = await fetch("https://remoteok.com/api", {
      headers: { "User-Agent": "NexJob/1.0 job aggregator" },
      cache: "no-store",
    })

    if (!res.ok) return raw

    const data = await res.json()
    // First element is a legal notice object — skip it
    const jobs = (Array.isArray(data) ? data.slice(1) : []) as any[]

    for (const j of jobs) {
      if (!j.position) continue
      if (!keywordMatch(`${j.position} ${j.description || ""}`, ctx.query)) continue

      raw.push({
        title: j.position,
        company: j.company || "Unknown",
        company_logo: j.company_logo || null,
        location: j.location || "Remote Worldwide",
        work_mode: "remote",
        job_type: "full_time",
        salary_min: j.salary_min || null,
        salary_max: j.salary_max || null,
        source: "remoteok",
        source_url: j.url || `https://remoteok.com/remote-jobs/${j.id}`,
        description: cleanHtml(j.description),
        external_id: `remoteok_${j.id}`,
        posted_at: j.date || ctx.now,
        is_active: true,
        expires_at: ctx.expires,
      })
    }
  } catch (e) {
    console.error("RemoteOK error:", e)
  }

  return raw
}
