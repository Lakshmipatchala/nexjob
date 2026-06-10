import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId") || ""
    const query = searchParams.get("query") || ""

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    let dbQuery = supabase
      .from("jobs")
      .select("*")
      .eq("is_active", true)
      .order("posted_at", { ascending: false })
      .limit(2000)

    if (query && query.trim()) {
      dbQuery = dbQuery.ilike("title", `%${query.trim()}%`)
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