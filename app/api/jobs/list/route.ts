import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const userId = searchParams.get("userId") || ""
    const query = searchParams.get("query") || ""

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    let dbQuery = supabase
      .from("jobs")
      .select("*")
      .gte("posted_at", sevenDaysAgo)
      .order("posted_at", { ascending: false })
      .limit(500)

    if (query && query.trim()) {
      dbQuery = dbQuery.ilike("title", `%${query.trim()}%`)
    }

    if (search && search.trim()) {
      dbQuery = dbQuery.ilike("title", `%${search.trim()}%`)
    }

    const { data, error } = await dbQuery
    if (error) throw error

    let jobs = data || []

    if (userId) {
      const { data: applied } = await supabase
        .from("applications")
        .select("job_id")
        .eq("user_id", userId)
      const appliedIds = new Set((applied || []).map((a: any) => a.job_id))
      jobs = jobs.filter((j: any) => !appliedIds.has(j.id))
    }

    return NextResponse.json({ jobs })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}