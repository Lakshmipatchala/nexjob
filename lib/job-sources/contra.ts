import { NormalizedJob, FetchContext, cleanHtml, detectWorkMode, keywordMatch } from "./types"

// Contra — freelance platform, public GraphQL API, no auth needed
export async function fetchContra(ctx: FetchContext): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

  try {
    const res = await fetch("https://contra.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        query: `query SearchOpportunities($query: String!, $first: Int) {
          opportunities(query: $query, first: $first) {
            edges {
              node {
                id
                title
                description
                location
                budget { min max currency }
                postedAt
                isRemote
                client {
                  name
                  avatarUrl
                }
                url
              }
            }
          }
        }`,
        variables: { query: ctx.query, first: 50 },
      }),
      cache: "no-store",
    })

    if (!res.ok) return raw
    const data = await res.json()

    for (const edge of data.data?.opportunities?.edges || []) {
      const j = edge.node
      if (!j.title) continue
      if (!keywordMatch(`${j.title} ${j.description || ""}`, ctx.query)) continue

      const loc = j.isRemote ? "Remote Worldwide" : j.location || "Remote Worldwide"

      raw.push({
        title: j.title,
        company: j.client?.name || "Independent",
        company_logo: j.client?.avatarUrl || null,
        location: loc,
        work_mode: "remote",
        job_type: "contract",
        salary_min: j.budget?.min || null,
        salary_max: j.budget?.max || null,
        source: "contra",
        source_url: j.url || `https://contra.com/opportunity/${j.id}`,
        description: cleanHtml(j.description || ""),
        external_id: `contra_${j.id}`,
        posted_at: j.postedAt || ctx.now,
        is_active: true,
        expires_at: ctx.expires,
      })
    }
  } catch (e) {
    console.error("Contra error:", e)
  }

  return raw
}
