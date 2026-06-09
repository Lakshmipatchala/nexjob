import { NormalizedJob, FetchContext, cleanHtml, detectWorkMode, detectJobType } from "./types"

// Dice public job search API (US tech jobs)
export async function fetchDice(ctx: FetchContext): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

  // Dice only covers US market — skip if no US in countries
  if (!ctx.countries.includes("US") && !ctx.countries.includes("GLOBAL")) return raw

  try {
    const url =
      `https://job-search-api.svc.dhigroupinc.com/v1/dice/jobs/search` +
      `?q=${encodeURIComponent(ctx.query)}` +
      `&countryCode2=US` +
      `&pageSize=100` +
      `&facets=employmentType%7CpostedDate%7CworkplaceTypes%7CemployerType%7CeasyApply%7CisRemote` +
      `&fields=id%2Ctitle%2CemploymentType%2CpostedDate%2CcompanyPageUrl%2CcompanyLogoUrl%2Clocation%2CworkplaceTypes%2CisRemote%2CapplyDataItem%2CemployerType%2CeasyApply%2CdescriptionTeaser%2CcompanyName`

    const res = await fetch(url, {
      headers: {
        "x-api-key": "1YAt0R9wBg4WfsF9VB2778F5CHLAPMVW3WAZcKd8",
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!res.ok) return raw

    const data = await res.json()

    for (const j of data.data || []) {
      if (!j.title) continue

      const loc = j.location || "United States"

      raw.push({
        title: j.title,
        company: j.companyName || "Unknown",
        company_logo: j.companyLogoUrl || null,
        location: loc,
        work_mode: detectWorkMode(j.title, loc, j.descriptionTeaser),
        job_type: detectJobType(j.employmentType || ""),
        salary_min: null,
        salary_max: null,
        source: "dice",
        source_url: j.applyDataItem?.applyUrl || `https://www.dice.com/job-detail/${j.id}`,
        description: cleanHtml(j.descriptionTeaser),
        external_id: `dice_${j.id}`,
        posted_at: j.postedDate || ctx.now,
        is_active: true,
        expires_at: ctx.expires,
      })
    }
  } catch (e) {
    console.error("Dice error:", e)
  }

  return raw
}
