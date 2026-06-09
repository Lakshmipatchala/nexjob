import { NormalizedJob, FetchContext, cleanHtml, detectWorkMode, detectJobType, keywordMatch } from "./types"

const BAMBOOHR_COMPANIES = [
  "zendeskrecruiting", "squarespace", "surveymonkey", "grammarly",
  "yelp", "glassdoor", "indeed", "ziprecruiter", "monster",
  "thumbtack", "nextdoor", "offerup", "poshmark", "mercari",
  "wish", "letgo", "5miles", "tradesy",
  "ancestry", "23andme", "color-genomics",
  "calm", "headspace", "betterhelp", "talkspace",
  "coursera", "udemy", "skillshare", "masterclass", "pluralsight",
  "duolingo", "babbel", "rosetta-stone",
  "rover", "wag", "petco", "chewy",
  "allbirds", "warby-parker", "casper", "away", "everlane",
  "lululemon", "peloton", "mirror", "tonal",
  "doordash", "instacart", "grubhub", "postmates",
  "uber-eats", "gopuff", "jokr", "buyk",
  "opendoor", "offerpad", "knock", "orchard",
  "redfin", "compass", "realtor", "zillow",
  "nerdwallet", "creditkarma", "mint", "personal-capital",
  "robinhood", "acorns", "stash", "betterment", "wealthfront",
]

export async function fetchBambooHR(ctx: FetchContext): Promise<NormalizedJob[]> {
  const raw: NormalizedJob[] = []

  for (const company of BAMBOOHR_COMPANIES) {
    try {
      const res = await fetch(
        `https://${company}.bamboohr.com/jobs/embed2.php?version=1.0.0`,
        { cache: "no-store" }
      )
      if (!res.ok) continue

      const text = await res.text()

      const jsonMatch = text.match(/window\.BambooHR\.Jobs\s*=\s*(\[[\s\S]*?\]);/)
      if (!jsonMatch) continue

      let jobs: any[]
      try {
        jobs = JSON.parse(jsonMatch[1])
      } catch {
        continue
      }

      for (const j of jobs) {
        if (!j.jobOpeningName) continue
        if (!keywordMatch(`${j.jobOpeningName} ${j.jobDescription || ""}`, ctx.query)) continue

        const loc = [j.location?.city, j.location?.state, j.location?.country]
          .filter(Boolean).join(", ") || "United States"

        raw.push({
          title: j.jobOpeningName,
          company: company.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          company_logo: null,
          location: loc,
          work_mode: detectWorkMode(j.jobOpeningName, loc, j.jobDescription || ""),
          job_type: detectJobType(j.employmentType || ""),
          salary_min: null,
          salary_max: null,
          source: "bamboohr",
          source_url: `https://${company}.bamboohr.com/jobs/${j.id}`,
          description: cleanHtml(j.jobDescription || ""),
          external_id: `bamboohr_${company}_${j.id}`,
          posted_at: j.datePosted || ctx.now,
          is_active: true,
          expires_at: ctx.expires,
        })
      }
    } catch (e) {
      console.error("BambooHR error:", company, e)
    }
  }

  return raw
}
