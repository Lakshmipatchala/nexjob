import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const source = searchParams.get("source") || ""
    const showAll = searchParams.get("showAll") === "true"

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    let query = supabase
      .from("jobs")
      .select("*")
      .order("posted_at", { ascending: false })
      .limit(200)

    if (!showAll) {
      // Show jobs posted in the last 30 days (active ones)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte("posted_at", thirtyDaysAgo)
    }

    if (search) query = query.ilike("title", `%${search}%`)
    if (source) query = query.eq("source", source)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ jobs: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
