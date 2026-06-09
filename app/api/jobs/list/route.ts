import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId") || ""
    const query = searchParams.get("query") || ""
    const country = (searchParams.get("country") || "").toUpperCase()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    let dbQuery = supabase
      .from("jobs")
      .select("*")
      .eq("is_active", true)
      .order("posted_at", { ascending: false })
      .limit(500)

    if (query && query.trim()) {
      dbQuery = dbQuery.ilike("title", `%${query.trim()}%`)
    }

    // Filter by country when a specific one is selected (not GLOBAL/REMOTE/empty)
    if (country && country !== "GLOBAL" && country !== "REMOTE" && country !== "ALL") {
      const countryNames: Record<string, string[]> = {
        US: ["United States", "USA"],
        IN: ["India", "Bangalore", "Mumbai", "Delhi", "Hyderabad", "Pune", "Chennai"],
        GB: ["United Kingdom", "London", "England"],
        CA: ["Canada", "Toronto", "Vancouver", "Montreal"],
        AU: ["Australia", "Sydney", "Melbourne"],
        DE: ["Germany", "Berlin", "Munich", "Hamburg"],
        SG: ["Singapore"],
        AE: ["UAE", "Dubai", "Abu Dhabi", "United Arab Emirates"],
        SA: ["Saudi Arabia", "Riyadh", "Jeddah"],
        FR: ["France", "Paris"],
        NL: ["Netherlands", "Amsterdam"],
        HK: ["Hong Kong"],
        JP: ["Japan", "Tokyo"],
        PL: ["Poland", "Warsaw"],
        BR: ["Brazil"],
        ZA: ["South Africa", "Cape Town", "Johannesburg"],
      }
      const terms = countryNames[country]
      if (terms) {
        const orFilter = terms.map(t => `location.ilike.%${t}%`).join(",")
        dbQuery = (dbQuery as any).or(orFilter)
      }
    }

    const { data, error } = await dbQuery
    if (error) throw error

    let jobs = data || []

    if (userId && jobs.length > 0) {
      const { data: applied } = await supabase
        .from("applications")
        .select("job_id")
        .eq("user_id", userId)
      const appliedIds = new Set((applied || []).map((a: any) => a.job_id))
      jobs = jobs.filter((j: any) => !appliedIds.has(j.id))
    }

    return NextResponse.json({ jobs, total: jobs.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}