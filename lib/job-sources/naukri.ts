import { NormalizedJob, FetchContext, cleanHtml, detectWorkMode, detectJobType, keywordMatch } from "./types"

// Naukri.com — largest job board in India, public search API
export async function fetchNaukri(ctx: FetchContext): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

  // Only fetch when India is in scope
  if (!ctx.countries.includes("IN") && !ctx.countries.includes("GLOBAL")) {
    return raw
  }

  // Naukri public job search endpoint (no auth required for basic search)
  const INDIA_CITIES = [
    "bangalore", "mumbai", "delhi", "hyderabad", "pune",
    "chennai", "kolkata", "noida", "gurgaon", "ahmedabad",
  ]

  for (const city of INDIA_CITIES.slice(0, 5)) {
    try {
      const res = await fetch(
        `https://www.naukri.com/jobapi/v3/search?noOfResults=20&urlType=search_by_key_loc&searchType=adv&keyword=${encodeURIComponent(ctx.query)}&location=${city}&pageNo=1&seoKey=${encodeURIComponent(ctx.query)}-jobs-in-${city}`,
        {
          headers: {
            "Accept": "application/json",
            "appid": "109",
            "systemid": "109",
          },
          cache: "no-store",
        }
      )
      if (!res.ok) continue

      const data = await res.json()

      for (const j of data.jobDetails || []) {
        const title = j.title
        if (!title) continue

        const loc = [j.placeholders?.find((p: any) => p.type === "location")?.label, "India"]
          .filter(Boolean).join(", ")

        raw.push({
          title,
          company: j.companyName || "Unknown",
          company_logo: j.logoPath ? `https://static.naukimg.com/s/0/0/${j.logoPath}` : null,
          location: loc,
          work_mode: detectWorkMode(title, loc, j.jobDescription || ""),
          job_type: detectJobType(j.employmentType || ""),
          salary_min: null,
          salary_max: null,
          source: "naukri",
          source_url: j.jdURL ? `https://www.naukri.com${j.jdURL}` : "",
          description: cleanHtml(j.jobDescription || j.jobDescription || ""),
          external_id: `naukri_${j.jobId}`,
          posted_at: j.footerPlaceholderLabel
            ? ctx.now
            : ctx.now,
          is_active: true,
          expires_at: ctx.expires,
        })
      }
    } catch (e) {
      console.error("Naukri error:", city, e)
    }
  }

  return raw
}
