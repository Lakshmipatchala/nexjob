import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    const authHeader = request.headers.get("Authorization") || ""
    const token = authHeader.replace("Bearer ", "").trim()
    if (!token || token === "null" || token === "undefined") {
      return NextResponse.json({ applications: [] })
    }

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ applications: [] })

    const { data, error } = await supabase
      .from("applications")
      .select("id, job_id, status, notes, applied_at, created_at, jobs(title, company, location, source_url, work_mode, source)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) throw error
    return NextResponse.json({ applications: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    const authHeader = request.headers.get("Authorization") || ""
    const token = authHeader.replace("Bearer ", "").trim()
    if (!token || token === "null" || token === "undefined") {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 })
    }

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 })

    const { job_id, status, notes } = await request.json()

    const { data: existing } = await supabase
      .from("applications")
      .select("id")
      .eq("user_id", user.id)
      .eq("job_id", job_id)
      .maybeSingle()

    if (existing) {
      await supabase.from("applications")
        .update({ status: status || "applied", updated_at: new Date().toISOString() })
        .eq("id", existing.id)
    } else {
      const { error } = await supabase.from("applications")
        .insert({
          user_id: user.id,
          job_id,
          status: status || "applied",
          notes: notes || "",
          applied_at: new Date().toISOString()
        })
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    const authHeader = request.headers.get("Authorization") || ""
    const token = authHeader.replace("Bearer ", "").trim()
    if (!token || token === "null" || token === "undefined") {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 })
    }

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 })

    const { id, status, notes } = await request.json()
    const { error } = await supabase
      .from("applications")
      .update({ status, notes, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}