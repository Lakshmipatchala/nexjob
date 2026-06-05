import { createClient } from "@/lib/supabase"

let cachedToken: string | null = null

export async function getAuthToken(): Promise<string | null> {
  if (cachedToken) return cachedToken
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  cachedToken = data.session?.access_token || null
  return cachedToken
}

export async function authFetch(url: string, options: RequestInit = {}) {
  const token = await getAuthToken()
  if (!token) throw new Error("Not logged in")
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    }
  })
}