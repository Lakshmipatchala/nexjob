import { NormalizedJob, FetchContext, cleanHtml, detectWorkMode, detectJobType, keywordMatch } from "./types"

// YC Jobs via Hacker News "Who is Hiring?" threads
// Parses the monthly HN thread using the Algolia HN API — no auth needed

async function getLatestWhoIsHiringId(): Promise<number | null> {
  try {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?query=Ask+HN+Who+is+hiring&tags=story,ask_hn&hitsPerPage=5`,
      { cache: "no-store" }
    )
    if (!res.ok) return null
    const data = await res.json()
    const hit = (data.hits || []).find((h: any) =>
      /who is hiring/i.test(h.title) && h.author === "whoishiring"
    )
    return hit ? Number(hit.objectID) : null
  } catch {
    return null
  }
}

export async function fetchYCJobs(ctx: FetchContext): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

  try {
    const threadId = await getLatestWhoIsHiringId()
    if (!threadId) return raw

    // Fetch top-level comments (each is a company posting)
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?tags=comment,story_${threadId}&hitsPerPage=100`,
      { cache: "no-store" }
    )
    if (!res.ok) return raw

    const data = await res.json()

    for (const hit of data.hits || []) {
      const text: string = hit.comment_text || ""
      if (!text || text.length < 100) continue
      if (!keywordMatch(text, ctx.query)) continue

      // Extract company name from first line (convention: "CompanyName | Role | Location")
      const firstLine = text.replace(/<[^>]+>/g, "").split(/\n/)[0].slice(0, 120)
      const parts = firstLine.split(/\s*[\|\/]\s*/)
      const company = parts[0]?.trim() || "Unknown"
      const title = parts[1]?.trim() || ctx.query

      // Detect location from text
      const locMatch = text.match(/\b(Remote|New York|San Francisco|London|Berlin|Toronto|Austin|Seattle|Boston|Amsterdam)\b/i)
      const loc = locMatch ? locMatch[1] : "Remote / Worldwide"

      raw.push({
        title,
        company,
        company_logo: null,
        location: loc,
        work_mode: detectWorkMode(title, loc, text),
        job_type: detectJobType(text),
        salary_min: null,
        salary_max: null,
        source: "hackernews",
        source_url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
        description: cleanHtml(text).slice(0, 2000),
        external_id: `hn_${hit.objectID}`,
        posted_at: hit.created_at || ctx.now,
        is_active: true,
        expires_at: ctx.expires,
      })
    }
  } catch (e) {
    console.error("YC/HN Jobs error:", e)
  }

  return raw
}
