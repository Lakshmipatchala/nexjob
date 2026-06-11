import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId") || ""
    if (!userId) return NextResponse.json({ applications: [] })

    const { data, error } = await supabase
      .from("applications")
      .select("id, job_id, status, notes, applied_at, created_at, job_data")
      .eq("user_id", userId)
      .order("applied_at", { ascending: false })

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

    const { userId, jobId, jobData, status, notes, job_id } = await request.json()
    const user_id = userId
    const finalJobId = jobId || job_id
    if (!user_id || !finalJobId) return NextResponse.json({ error: "Missing userId or jobId" }, { status: 400 })

    const { data: existing } = await supabase
      .from("applications")
      .select("id")
      .eq("user_id", user_id)
      .eq("job_id", finalJobId)
      .maybeSingle()

    if (existing) {
      await supabase.from("applications")
        .update({ status: status || "applied" })
        .eq("id", existing.id)
    } else {
      const { error } = await supabase.from("applications")
        .insert({
          user_id: user_id,
          job_id: finalJobId,
          job_data: jobData || {},
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

    const { id, status, notes } = await request.json()
    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    const { error } = await supabase
      .from("applications")
      .update(updateData)
      .eq("id", id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}