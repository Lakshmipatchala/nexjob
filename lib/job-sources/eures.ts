import { NormalizedJob, FetchContext, cleanHtml, detectWorkMode, detectJobType, keywordMatch } from "./types"

// EURES — official EU job mobility portal, public REST API, no auth needed
// Covers all 27 EU member states + Norway, Iceland, Liechtenstein, Switzerland

const EURES_COUNTRY_MAP: Record<string, string> = {
  DE: "DE", FR: "FR", NL: "NL", ES: "ES", IT: "IT",
  PL: "PL", SE: "SE", NO: "NO", DK: "DK", FI: "FI",
  AT: "AT", BE: "BE", PT: "PT", IE: "IE", CZ: "CZ",
  RO: "RO", HU: "HU", CH: "CH", SK: "SK", BG: "BG",
  HR: "HR", LT: "LT", LV: "LV", EE: "EE", SI: "SI",
  LU: "LU", MT: "MT", CY: "CY", GR: "GR", IS: "IS",
}

export async function fetchEURES(ctx: FetchContext): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

  const activeEU = ctx.countries.filter(c => EURES_COUNTRY_MAP[c])
  const countryFilter = activeEU.length > 0 ? activeEU : Object.keys(EURES_COUNTRY_MAP)

  // EURES REST API — search endpoint
  try {
    const res = await fetch(
      "https://eures.ec.europa.eu/api/v1/jv-search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          keywords: ctx.query,
          dataSetRequest: {
            pageNumber: 0,
            pageSize: 100,
            sortSearch: "BEST_MATCH",
          },
          countryCode: countryFilter.slice(0, 10),
        }),
        cache: "no-store",
      }
    )

    if (res.ok) {
      const data = await res.json()

      for (const j of data.jvs || data.jobVacancies || []) {
        const title = j.header?.title || j.position?.title
        if (!title) continue

        const country = j.header?.placeOfWork?.countryCode || ""
        const city = j.header?.placeOfWork?.city || ""
        const loc = [city, EURES_COUNTRY_MAP[country] ? country : country].filter(Boolean).join(", ") || "Europe"

        raw.push({
          title,
          company: j.header?.employer?.name || "Unknown",
          company_logo: null,
          location: loc,
          work_mode: detectWorkMode(title, loc, j.body?.description || ""),
          job_type: detectJobType(j.header?.contractType || ""),
          salary_min: null,
          salary_max: null,
          source: "eures",
          source_url: j.header?.applyUrl || `https://eures.ec.europa.eu/en/jobs/${j.id}`,
          description: cleanHtml(j.body?.description || ""),
          external_id: `eures_${j.id || j.header?.id}`,
          posted_at: j.header?.publicationDate || ctx.now,
          is_active: true,
          expires_at: ctx.expires,
        })
      }
    }
  } catch (e) {
    console.error("EURES error:", e)
  }

  return raw
}
