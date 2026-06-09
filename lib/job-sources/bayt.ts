import { NormalizedJob, FetchContext, cleanHtml, detectWorkMode, detectJobType, keywordMatch } from "./types"

// Bayt.com — largest job board in Middle East, public RSS feeds
const BAYT_COUNTRIES = [
  { code: "ae", name: "UAE" },
  { code: "sa", name: "Saudi Arabia" },
  { code: "kw", name: "Kuwait" },
  { code: "qa", name: "Qatar" },
  { code: "bh", name: "Bahrain" },
  { code: "om", name: "Oman" },
  { code: "eg", name: "Egypt" },
  { code: "jo", name: "Jordan" },
  { code: "lb", name: "Lebanon" },
]

export async function fetchBayt(ctx: FetchContext): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

  const activeCountries = BAYT_COUNTRIES.filter(c =>
    ctx.countries.some(cc => cc.toLowerCase() === c.code)
  )
  const targets = activeCountries.length > 0 ? activeCountries : BAYT_COUNTRIES.slice(0, 4)

  for (const country of targets) {
    try {
      const res = await fetch(
        `https://www.bayt.com/en/${country.code}/jobs/${encodeURIComponent(ctx.query.replace(/\s+/g, "-"))}-jobs/?format=rss`,
        { cache: "no-store" }
      )
      if (!res.ok) continue

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

        const company = (item.match(/<company><!\[CDATA\[(.*?)\]\]><\/company>/) ||
          item.match(/<dc:creator><!\[CDATA\[(.*?)\]\]><\/dc:creator>/))?.[1]?.trim() || "Unknown"

        raw.push({
          title,
          company,
          company_logo: null,
          location: country.name,
          work_mode: detectWorkMode(title, country.name, desc),
          job_type: "full_time",
          salary_min: null,
          salary_max: null,
          source: "bayt",
          source_url: link,
          description: cleanHtml(desc),
          external_id: `bayt_${Buffer.from(guid).toString("base64").slice(0, 32)}`,
          posted_at: pubDate ? new Date(pubDate).toISOString() : ctx.now,
          is_active: true,
          expires_at: ctx.expires,
        })
      }
    } catch (e) {
      console.error("Bayt error:", country.code, e)
    }
  }

  return raw
}
