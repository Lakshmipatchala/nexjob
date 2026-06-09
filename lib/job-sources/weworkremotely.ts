import { NormalizedJob, FetchContext, cleanHtml, keywordMatch } from "./types"

// WeWorkRemotely exposes public RSS feeds per category — no auth needed
const WWR_FEEDS = [
  "https://weworkremotely.com/categories/remote-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss",
  "https://weworkremotely.com/categories/remote-design-jobs.rss",
  "https://weworkremotely.com/categories/remote-product-jobs.rss",
  "https://weworkremotely.com/categories/remote-management-finance-jobs.rss",
  "https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss",
]

export async function fetchWeWorkRemotely(ctx: FetchContext): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

  for (const feedUrl of WWR_FEEDS) {
    try {
      const res = await fetch(feedUrl, {
        headers: { "Accept": "application/rss+xml, application/xml, text/xml" },
        cache: "no-store",
      })

      if (!res.ok) continue

      const text = await res.text()
      const items = parseRSSItems(text)

      for (const item of items) {
        if (!item.title) continue
        if (!keywordMatch(`${item.title} ${item.description}`, ctx.query)) continue

        const company = extractCompany(item.title)
        const title = extractTitle(item.title)

        raw.push({
          title,
          company,
          company_logo: null,
          location: item.region || "Remote Worldwide",
          work_mode: "remote",
          job_type: "full_time",
          salary_min: null,
          salary_max: null,
          source: "weworkremotely",
          source_url: item.link || "",
          description: cleanHtml(item.description),
          external_id: `wwr_${item.guid || slugify(title + company)}`,
          posted_at: item.pubDate ? new Date(item.pubDate).toISOString() : ctx.now,
          is_active: true,
          expires_at: ctx.expires,
        })
      }
    } catch (e) {
      console.error("WeWorkRemotely error:", feedUrl, e)
    }
  }

  return raw
}

type RSSItem = {
  title: string
  link: string
  description: string
  pubDate: string
  guid: string
  region: string
}

function parseRSSItems(xml: string): RSSItem[] {
  const items: RSSItem[] = []
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)

  for (const match of itemMatches) {
    const block = match[1]
    items.push({
      title: extractTag(block, "title"),
      link: extractTag(block, "link"),
      description: extractTag(block, "description"),
      pubDate: extractTag(block, "pubDate"),
      guid: extractTag(block, "guid"),
      region: extractTag(block, "region"),
    })
  }

  return items
}

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`))
  return (m?.[1] || m?.[2] || "").trim()
}

// WWR titles are formatted as "Company: Job Title"
function extractCompany(title: string): string {
  return title.split(":")[0]?.trim() || "Unknown"
}

function extractTitle(title: string): string {
  const parts = title.split(":")
  return (parts.length > 1 ? parts.slice(1).join(":") : title).trim()
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 60)
}
