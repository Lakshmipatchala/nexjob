import { NormalizedJob, FetchContext, cleanHtml, detectWorkMode, detectJobType, keywordMatch } from "./types"

const SMARTRECRUITERS_COMPANIES = [
  "IKEA", "Lidl", "Aldi", "MediaMarkt", "OBI",
  "Bosch", "Siemens", "SAP", "Deutsche-Telekom", "Vodafone",
  "Allianz", "AXA", "Zurich", "Munich-Re",
  "KPMG", "Deloitte", "PwC", "EY", "Accenture",
  "Capgemini", "Infosys", "Wipro", "HCL", "TCS",
  "H-M", "Zara", "Uniqlo", "Primark",
  "LVMH", "Kering", "Richemont",
  "Nestle", "Unilever", "Danone", "AB-InBev",
  "Atlassian", "Zendesk", "HubSpot", "Salesforce",
  "ServiceNow", "Workday", "Oracle", "SAP-SE",
  "LinkedIn", "Twitter", "Snap", "Pinterest",
  "Warner-Bros", "Universal", "Sony-Music",
  "Spotify", "Deezer", "SoundCloud",
  "Roche", "Novartis", "AstraZeneca", "Pfizer", "J-J",
  "Bayer", "Sanofi", "GSK",
]

export async function fetchSmartRecruiters(ctx: FetchContext): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

  try {
    const url =
      `https://api.smartrecruiters.com/v1/companies/jobs` +
      `?q=${encodeURIComponent(ctx.query)}&limit=100`

    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })

    if (res.ok) {
      const data = await res.json()

      for (const j of data.content || []) {
        if (!j.name) continue

        const loc = j.location
          ? [j.location.city, j.location.region, j.location.country].filter(Boolean).join(", ")
          : "Worldwide"

        raw.push({
          title: j.name,
          company: j.company?.name || "Unknown",
          company_logo: null,
          location: loc,
          work_mode: detectWorkMode(j.name, loc, j.jobAd?.sections?.jobDescription?.text || ""),
          job_type: detectJobType(j.typeOfEmployment?.id || ""),
          salary_min: null,
          salary_max: null,
          source: "smartrecruiters",
          source_url: j.ref || `https://careers.smartrecruiters.com/${j.company?.identifier}/${j.id}`,
          description: cleanHtml(j.jobAd?.sections?.jobDescription?.text || ""),
          external_id: `smartrecruiters_${j.id}`,
          posted_at: j.releasedDate || ctx.now,
          is_active: true,
          expires_at: ctx.expires,
        })
      }
    }
  } catch (e) {
    console.error("SmartRecruiters global search error:", e)
  }

  for (const company of SMARTRECRUITERS_COMPANIES.slice(0, 20)) {
    try {
      const res = await fetch(
        `https://api.smartrecruiters.com/v1/companies/${company}/postings?limit=100&q=${encodeURIComponent(ctx.query)}`,
        { cache: "no-store" }
      )
      if (!res.ok) continue

      const data = await res.json()

      for (const j of data.content || []) {
        if (!j.name || !keywordMatch(j.name, ctx.query)) continue

        const loc = j.location
          ? [j.location.city, j.location.region, j.location.country].filter(Boolean).join(", ")
          : "Worldwide"

        raw.push({
          title: j.name,
          company: company.replace(/-/g, " "),
          company_logo: null,
          location: loc,
          work_mode: detectWorkMode(j.name, loc, ""),
          job_type: detectJobType(j.typeOfEmployment?.id || ""),
          salary_min: null,
          salary_max: null,
          source: "smartrecruiters",
          source_url: `https://careers.smartrecruiters.com/${company}/${j.id}`,
          description: cleanHtml(j.jobAd?.sections?.jobDescription?.text || ""),
          external_id: `smartrecruiters_${j.id}`,
          posted_at: j.releasedDate || ctx.now,
          is_active: true,
          expires_at: ctx.expires,
        })
      }
    } catch (e) {
      console.error("SmartRecruiters company error:", company, e)
    }
  }

  return raw
}
