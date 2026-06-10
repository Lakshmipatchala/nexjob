import { NextResponse } from "next/server"

export async function GET() {
  const results: Record<string, any> = {}

  // Test Jooble
  try {
    const res = await fetch(`https://jooble.org/api/${process.env.JOOBLE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords: "engineer", location: "United States", page: "1", resultonpage: "5" })
    })
    const data = await res.json()
    results.jooble = { status: res.status, jobs: data.jobs?.length || 0, total: data.totalCount, key_set: !!process.env.JOOBLE_API_KEY }
  } catch (e: any) { results.jooble = { error: e.message } }

  // Test Jobicy
  try {
    const res = await fetch("https://jobicy.com/api/v2/remote-jobs?count=5")
    const data = await res.json()
    results.jobicy = { status: res.status, jobs: data.jobs?.length || 0 }
  } catch (e: any) { results.jobicy = { error: e.message } }

  // Test Remotive
  try {
    const res = await fetch("https://remotive.com/api/remote-jobs?search=engineer&limit=5")
    const data = await res.json()
    results.remotive = { status: res.status, jobs: data.jobs?.length || 0 }
  } catch (e: any) { results.remotive = { error: e.message } }

  // Test Greenhouse
  try {
    const res = await fetch("https://boards-api.greenhouse.io/v1/boards/stripe/jobs")
    const data = await res.json()
    results.greenhouse = { status: res.status, jobs: data.jobs?.length || 0 }
  } catch (e: any) { results.greenhouse = { error: e.message } }

  // Test Himalayas
  try {
    const res = await fetch("https://himalayas.app/jobs/api?q=engineer&limit=5")
    const data = await res.json()
    results.himalayas = { status: res.status, jobs: data.jobs?.length || 0 }
  } catch (e: any) { results.himalayas = { error: e.message } }

  // Test JSearch
  try {
    const res = await fetch(
      "https://jsearch.p.rapidapi.com/search?query=engineer&num_pages=1&page=1&country=us",
      { headers: { "x-rapidapi-host": "jsearch.p.rapidapi.com", "x-rapidapi-key": process.env.RAPIDAPI_KEY || "" } }
    )
    results.jsearch = { status: res.status, key_set: !!process.env.RAPIDAPI_KEY }
  } catch (e: any) { results.jsearch = { error: e.message } }

  // Test Adzuna
  try {
    const res = await fetch(`https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&what=engineer&results_per_page=5`)
    const data = await res.json()
    results.adzuna = { status: res.status, jobs: data.results?.length || 0, key_set: !!process.env.ADZUNA_APP_ID }
  } catch (e: any) { results.adzuna = { error: e.message } }

  return NextResponse.json({ env_keys: {
    RAPIDAPI_KEY: !!process.env.RAPIDAPI_KEY,
    JOOBLE_API_KEY: !!process.env.JOOBLE_API_KEY,
    ADZUNA_APP_ID: !!process.env.ADZUNA_APP_ID,
    ADZUNA_APP_KEY: !!process.env.ADZUNA_APP_KEY,
  }, results })
}