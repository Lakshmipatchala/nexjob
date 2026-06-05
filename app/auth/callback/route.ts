import { createServerSupabaseClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      const { data: existing } = await supabase.from("profiles").select("id").eq("id", data.user.id).single()
      if (!existing) {
        await supabase.from("profiles").insert({
          id: data.user.id,
          email: data.user.email,
          first_name: data.user.user_metadata?.full_name?.split(" ")[0] || "",
          last_name: data.user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "",
          autofill_engine: "backend"
        })
      }
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}