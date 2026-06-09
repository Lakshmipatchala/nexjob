import { NormalizedJob, FetchContext, cleanHtml, detectWorkMode, detectJobType, keywordMatch } from "./types"

const WORKABLE_COMPANIES = [
  "taxfix", "taxscouts", "kontist", "penta-bank", "qonto",
  "sumup", "revolut", "monzo", "starling-bank", "wise",
  "checkout", "payoneer", "paysafe", "worldline",
  "deliveroo", "gorillas", "getir", "flink",
  "wolt", "bolt-eu", "tier", "voi",
  "typeform", "hotjar", "contentsquare", "amplitude-analytics",
  "personio", "hibob", "factorial-hr", "kenjo",
  "jobandtalent", "cornershop", "glovo",
  "cabify", "blablacar", "kapten",
  "klarna", "zettle", "izettle",
  "spotify", "king", "paradox-interactive",
  "aircall", "ringover", "dialpad",
  "freshworks", "zendesk", "intercom",
  "pipedrive", "copper", "close-crm",
  "teamwork", "basecamp", "monday",
  "miro-app", "lucidspark", "whimsical",
  "loom-app", "vidyard", "wistia",
]

export async function fetchWorkable(ctx: FetchContext): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

  for (const company of WORKABLE_COMPANIES) {
    try {
      const res = await fetch(
        `https://apply.workable.com/api/v3/accounts/${company}/jobs?details=true`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: ctx.query, limit: 100 }),
          cache: "no-store",
        }
      )
      if (!res.ok) continue

      const data = await res.json()

      for (const j of (data.results || [])) {
        if (!j.title) continue
        if (!keywordMatch(`${j.title} ${j.description || ""}`, ctx.query)) continue

        const loc = [j.city, j.state, j.country].filter(Boolean).join(", ") || "Remote / Worldwide"

        raw.push({
          title: j.title,
          company: j.account?.name || company.charAt(0).toUpperCase() + company.slice(1),
          company_logo: j.account?.logo || null,
          location: loc,
          work_mode: detectWorkMode(j.title, loc, j.description),
          job_type: detectJobType(j.employment_type || ""),
          salary_min: null,
          salary_max: null,
          source: "workable",
          source_url: j.url || `https://apply.workable.com/${company}/j/${j.shortcode}`,
          description: cleanHtml(j.description),
          external_id: `workable_${j.id || j.shortcode}`,
          posted_at: j.published_on || ctx.now,
          is_active: true,
          expires_at: ctx.expires,
        })
      }
    } catch (e) {
      console.error("Workable error:", company, e)
    }
  }

  return raw
}
