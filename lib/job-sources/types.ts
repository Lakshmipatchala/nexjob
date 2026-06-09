export type NormalizedJob = {
  title: string
  company: string
  company_logo: string | null
  location: string
  work_mode: "remote" | "hybrid" | "onsite"
  job_type: "full_time" | "part_time" | "contract"
  salary_min: number | null
  salary_max: number | null
  source: string
  source_url: string
  description: string
  external_id: string
  posted_at: string
  is_active: boolean
  expires_at: string
}

export type FetchContext = {
  query: string
  countries: string[]
  now: string
  expires: string
}

export function cleanHtml(value?: string): string {
  return (value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000)
}

export function detectWorkMode(title = "", location = "", description = ""): "remote" | "hybrid" | "onsite" {
  const text = `${title} ${location} ${description}`.toLowerCase()
  if (text.includes("remote")) return "remote"
  if (text.includes("hybrid")) return "hybrid"
  return "onsite"
}

export function detectJobType(value = ""): "full_time" | "part_time" | "contract" {
  const text = value.toLowerCase()
  if (text.includes("part")) return "part_time"
  if (text.includes("contract") || text.includes("temporary") || text.includes("corp")) return "contract"
  return "full_time"
}

export function keywordMatch(text: string, query: string): boolean {
  const q = query.toLowerCase().trim()
  const t = text.toLowerCase()
  return q.split(/\s+/).filter(Boolean).some(word => t.includes(word))
}

export const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  IN: "India",
  AU: "Australia",
  DE: "Germany",
  SG: "Singapore",
  AE: "UAE",
  NL: "Netherlands",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  PL: "Poland",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  CH: "Switzerland",
  AT: "Austria",
  BE: "Belgium",
  PT: "Portugal",
  IE: "Ireland",
  CZ: "Czech Republic",
  RO: "Romania",
  HU: "Hungary",
  KW: "Kuwait",
  SA: "Saudi Arabia",
  QA: "Qatar",
  BH: "Bahrain",
  OM: "Oman",
  JP: "Japan",
  KR: "South Korea",
  BR: "Brazil",
  MX: "Mexico",
  ZA: "South Africa",
  NG: "Nigeria",
  REMOTE: "Remote",
  GLOBAL: "Worldwide",
}

// Countries supported by Adzuna
export const ADZUNA_COUNTRY_MAP: Record<string, string> = {
  US: "us", CA: "ca", GB: "gb", AU: "au", DE: "de",
  FR: "fr", NL: "nl", SG: "sg", IN: "in", AE: "ae",
  IT: "it", ES: "es", PL: "pl", AT: "at", BE: "be",
  CH: "ch", NO: "no", SE: "se", BR: "br", MX: "mx",
  ZA: "za",
}
