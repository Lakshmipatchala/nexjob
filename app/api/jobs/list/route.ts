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
      .limit(100)

    // By default only show active jobs
    // showAll=true shows all including expired (for admin)
    if (!showAll) {
      query = query.eq("is_active", true)
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