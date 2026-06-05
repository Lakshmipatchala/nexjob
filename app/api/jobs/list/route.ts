import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const source = searchParams.get("source") || ""

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    // Show jobs from last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    let query = supabase
      .from("jobs")
      .select("*")
      .gte("posted_at", sevenDaysAgo)
      .order("posted_at", { ascending: false })
      .limit(500)

    if (search) query = query.ilike("title", `%${search}%`)
    if (source) query = query.eq("source", source)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ jobs: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}