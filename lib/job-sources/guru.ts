import { NormalizedJob, FetchContext, cleanHtml, detectWorkMode, keywordMatch } from "./types"

function strHash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h).toString(36)
}

// Guru.com — freelance marketplace, public job RSS feed
export async function fetchGuru(ctx: FetchContext): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

  try {
    const res = await fetch(
      `https://www.guru.com/jobs/search/?q=${encodeURIComponent(ctx.query)}&format=rss`,
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

      const link = item.match(/<link>(.*?)<\/link>/)?.[1]?.trim() || ""
      const desc = (item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ||
        item.match(/<description>([\s\S]*?)<\/description>/))?.[1] || ""
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim()
      const guid = item.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1]?.trim() || link

      // Budget often appears in description as "$X - $Y"
      const budgetMatch = desc.match(/\$\s*([\d,]+)\s*[-–]\s*\$\s*([\d,]+)/)
      const salaryMin = budgetMatch ? parseInt(budgetMatch[1].replace(/,/g, "")) : null
      const salaryMax = budgetMatch ? parseInt(budgetMatch[2].replace(/,/g, "")) : null

      raw.push({
        title,
        company: "Guru Client",
        company_logo: null,
        location: "Remote Worldwide",
        work_mode: "remote",
        job_type: "contract",
        salary_min: salaryMin,
        salary_max: salaryMax,
        source: "guru",
        source_url: link,
        description: cleanHtml(desc),
        external_id: `guru_${strHash(guid)}`,
        posted_at: pubDate ? new Date(pubDate).toISOString() : ctx.now,
        is_active: true,
        expires_at: ctx.expires,
      })
    }
  } catch (e) {
    console.error("Guru error:", e)
  }

  return raw
}
