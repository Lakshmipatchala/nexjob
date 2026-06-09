import { NormalizedJob, FetchContext, cleanHtml, detectWorkMode, detectJobType, COUNTRY_NAMES } from "./types"

// Jooble covers 69 countries via a single API — pass location name rather than country code
export async function fetchJooble(ctx: FetchContext): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []
  if (!process.env.JOOBLE_API_KEY) return raw

  const locations = ctx.countries.map(c => COUNTRY_NAMES[c] || c)

  for (const location of locations) {
    try {
      const res = await fetch(
        `https://jooble.org/api/${process.env.JOOBLE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords: ctx.query, location, resultsOnPage: 100 }),
          cache: "no-store",
        }
      )

      if (!res.ok) continue

      const data = await res.json()

      for (const j of data.jobs || []) {
        if (!j.title) continue

        const loc = j.location || location

        raw.push({
          title: j.title,
          company: j.company || "Unknown",
          company_logo: null,
          location: loc,
          work_mode: detectWorkMode(j.title, loc, j.snippet),
          job_type: detectJobType(j.type || ""),
          salary_min: j.salary ? parseSalaryMin(j.salary) : null,
          salary_max: j.salary ? parseSalaryMax(j.salary) : null,
          source: "jooble",
          source_url: j.link || "",
          description: cleanHtml(j.snippet),
          external_id: `jooble_${j.id || slugify(j.title + j.company + loc)}`,
          posted_at: j.updated || ctx.now,
          is_active: true,
          expires_at: ctx.expires,
        })
      }
    } catch (e) {
      console.error("Jooble error:", location, e)
    }
  }

  return raw
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 60)
}

function parseSalaryMin(s: string): number | null {
  const m = s.match(/[\d,]+/)
  return m ? parseInt(m[0].replace(/,/g, ""), 10) : null
}

function parseSalaryMax(s: string): number | null {
  const parts = s.match(/[\d,]+/g)
  if (!parts || parts.length < 2) return null
  return parseInt(parts[parts.length - 1].replace(/,/g, ""), 10)
}
