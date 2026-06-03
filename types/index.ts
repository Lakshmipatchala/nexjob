export type JobSource = "linkedin" | "indeed" | "glassdoor" | "wellfound" | "google_jobs" | "other"
export type JobType = "full_time" | "part_time" | "contract" | "internship"
export type WorkMode = "remote" | "hybrid" | "onsite"
export type ApplicationStatus = "applied" | "screening" | "interview" | "offer" | "rejected"
export type AutofillEngine = "backend" | "claude"

export interface Job {
  id: string
  title: string
  company: string
  company_logo?: string
  location: string
  work_mode: WorkMode
  job_type: JobType
  salary_min?: number
  salary_max?: number
  source: JobSource
  source_url: string
  description: string
  posted_at: string
  ai_match_score?: number
}

export interface UserProfile {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  linkedin_url?: string
  github_url?: string
  years_experience?: number
  work_authorization?: string
  autofill_engine: AutofillEngine
}

export interface Application {
  id: string
  user_id: string
  job: Job
  status: ApplicationStatus
  engine_used: AutofillEngine
  applied_at: string
  notes?: string
}