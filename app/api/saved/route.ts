import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

export async function POST(request: Request) {
  try {
    const { userId, jobId, jobData } = await request.json()
    if (!userId || !jobId) return NextResponse.json({ error: "Missing userId or jobId" }, { status: 400 })

    const { error } = await supabase
      .from("saved_jobs")
      .upsert({ user_id: userId, job_id: jobId, job_data: jobData, saved_at: new Date().toISOString() }, { onConflict: "user_id,job_id" })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId, jobId } = await request.json()
    if (!userId || !jobId) return NextResponse.json({ error: "Missing userId or jobId" }, { status: 400 })

    const { error } = await supabase
      .from("saved_jobs")
      .delete()
      .eq("user_id", userId)
      .eq("job_id", jobId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    if (!userId) return NextResponse.json({ savedIds: [] })

    const { data, error } = await supabase
      .from("saved_jobs")
      .select("job_id")
      .eq("user_id", userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ savedIds: (data || []).map((r: any) => r.job_id) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}