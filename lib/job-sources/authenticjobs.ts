import { NormalizedJob, FetchContext, cleanHtml, detectWorkMode, detectJobType, keywordMatch } from "./types"

function strHash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h).toString(36)
}

// Authentic Jobs — design, dev, and creative roles, public RSS feed
export async function fetchAuthenticJobs(ctx: FetchContext): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

  try {
    const res = await fetch(
      `https://authenticjobs.com/jobs/feed/?search=${encodeURIComponent(ctx.query)}&format=rss`,
      { cache: "no-store" }
    )
    if (!res.ok) return raw

    const xml = await res.text()
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || []

    for (const item of items) {
      const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
        item.match(/<title>(.*?)<\/title>/))?.[1]?.trim()
      if (!title) continue
      if (!keywordMatch(title, ctx.query)) continue

      const link = item.match(/<link>(.*?)<\/link>/)?.[1]?.trim() ||
        item.match(/<feedburner:origLink>(.*?)<\/feedburner:origLink>/)?.[1]?.trim() || ""
      const desc = (item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ||
        item.match(/<description>([\s\S]*?)<\/description>/))?.[1] || ""
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim()
      const guid = item.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1]?.trim() || link

      const company = (item.match(/<company><!\[CDATA\[(.*?)\]\]><\/company>/) ||
        item.match(/<dc:creator><!\[CDATA\[(.*?)\]\]><\/dc:creator>/))?.[1]?.trim() || "Unknown"

      const loc = (item.match(/<location><!\[CDATA\[(.*?)\]\]><\/location>/) ||
        item.match(/<location>(.*?)<\/location>/))?.[1]?.trim() || "Remote / Worldwide"

      raw.push({
        title,
        company,
        company_logo: null,
        location: loc,
        work_mode: detectWorkMode(title, loc, desc),
        job_type: detectJobType(
          (item.match(/<type><!\[CDATA\[(.*?)\]\]><\/type>/) ||
            item.match(/<type>(.*?)<\/type>/))?.[1] || ""
        ),
        salary_min: null,
        salary_max: null,
        source: "authenticjobs",
        source_url: link,
        description: cleanHtml(desc),
        external_id: `authenticjobs_${strHash(guid)}`,
        posted_at: pubDate ? new Date(pubDate).toISOString() : ctx.now,
        is_active: true,
        expires_at: ctx.expires,
      })
    }
  } catch (e) {
    console.error("Authentic Jobs error:", e)
  }

  return raw
}
