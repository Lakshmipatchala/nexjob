import { NormalizedJob, FetchContext, cleanHtml, detectWorkMode, detectJobType, keywordMatch } from "./types"

const JOBVITE_COMPANIES = [
  "amazon", "apple", "google", "meta", "microsoft",
  "netflix", "spotify", "twitter", "snap", "pinterest",
  "airbnb", "uber", "lyft", "doordash", "instacart",
  "shopify", "atlassian", "dropbox", "box", "evernote",
  "adobe", "autodesk", "intuit", "paypal", "ebay",
  "crowdstrike", "paloaltonetworks", "fortinet", "checkpoint",
  "qualys", "rapid7", "tenable", "carbon-black",
  "illumina", "10xgenomics", "pacbio", "oxford-nanopore",
  "guardant", "flatiron", "veeva", "medidata",
  "visa", "mastercard", "americanexpress", "capitalone",
  "schwab", "fidelity", "vanguard", "blackrock",
  "target", "costco", "kroger", "walgreens", "cvs",
  "homedepot", "lowes", "bestbuy", "nordstrom",
]

export async function fetchJobvite(ctx: FetchContext): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

  for (const company of JOBVITE_COMPANIES) {
    try {
      const res = await fetch(
        `https://jobs.jobvite.com/api/jobs?c=${company}&q=${encodeURIComponent(ctx.query)}&&d=json`,
        { cache: "no-store" }
      )
      if (!res.ok) continue

      const data = await res.json()

      for (const j of data.jobs || data.requisitions || []) {
        const title = j.title || j.jobTitle
        if (!title) continue
        if (!keywordMatch(`${title} ${j.description || ""}`, ctx.query)) continue

        const loc = j.location || j.city || "United States"

        raw.push({
          title,
          company: j.company || company.charAt(0).toUpperCase() + company.slice(1),
          company_logo: null,
          location: loc,
          work_mode: detectWorkMode(title, loc, j.description || ""),
          job_type: detectJobType(j.type || j.employmentType || ""),
          salary_min: null,
          salary_max: null,
          source: "jobvite",
          source_url: j.applyUrl || j.url || `https://jobs.jobvite.com/${company}/job/${j.id}`,
          description: cleanHtml(j.description || j.briefDescription || ""),
          external_id: `jobvite_${j.id || j.requisitionId}`,
          posted_at: j.date || ctx.now,
          is_active: true,
          expires_at: ctx.expires,
        })
      }
    } catch (e) {
      console.error("Jobvite error:", company, e)
    }
  }

  return raw
}
