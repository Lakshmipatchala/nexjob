import { NormalizedJob, FetchContext, cleanHtml, detectWorkMode, keywordMatch } from "./types"

const ASHBY_COMPANIES = [
  "openai", "mistral", "cohere", "adept", "inflection", "character",
  "stability", "runway", "pika", "kling", "suno", "eleven-labs",
  "perplexity", "you", "together", "fireworks", "modal", "replicate",
  "linear", "vercel", "railway", "fly", "render", "neon", "turso",
  "planetscale", "xata", "convex", "trigger", "inngest", "temporal",
  "grafana", "honeycomb", "incident-io", "pagerduty", "rootly",
  "ramp", "mercury", "brex", "deel", "remote", "rippling", "gusto",
  "stripe", "plaid", "modern-treasury", "increase", "column",
  "tempus", "color", "ro", "hims", "noom", "cerebral", "headway",
  "notion", "coda", "craft", "super", "tana", "capacities",
  "arc", "browser", "bezel", "raycast",
  "hex", "observable", "mode", "preset", "metabase", "lightdash",
  "cube", "transform", "dbt-labs", "datacoves",
  "snyk", "orca", "wiz", "lacework", "panther", "drata", "vanta",
  "retool", "airplane", "superblocks", "tooljet",
  "loom", "mmhmm", "descript", "captions",
]

export async function fetchAshby(ctx: FetchContext): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

  for (const company of ASHBY_COMPANIES) {
    try {
      const res = await fetch(
        `https://api.ashbyhq.com/posting-api/job-board/${company}?includeCompensation=true`,
        { cache: "no-store" }
      )
      if (!res.ok) continue

      const data = await res.json()

      for (const j of data.jobs || []) {
        if (!j.title) continue
        if (!keywordMatch(`${j.title} ${j.descriptionHtml || ""}`, ctx.query)) continue

        const loc = j.location || j.locationName || "Remote / Worldwide"

        raw.push({
          title: j.title,
          company: data.organization?.name || company.charAt(0).toUpperCase() + company.slice(1),
          company_logo: data.organization?.logoUrl || null,
          location: loc,
          work_mode: detectWorkMode(j.title, loc, j.descriptionHtml),
          job_type: "full_time",
          salary_min: j.compensation?.minValue || null,
          salary_max: j.compensation?.maxValue || null,
          source: "ashby",
          source_url: j.jobUrl || `https://jobs.ashbyhq.com/${company}/${j.id}`,
          description: cleanHtml(j.descriptionHtml),
          external_id: `ashby_${j.id}`,
          posted_at: j.publishedAt || ctx.now,
          is_active: true,
          expires_at: ctx.expires,
        })
      }
    } catch (e) {
      console.error("Ashby error:", company, e)
    }
  }

  return raw
}
