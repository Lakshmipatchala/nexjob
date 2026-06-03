import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const token = authHeader.replace("Bearer ", "")

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    // Get profile
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(profile)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}