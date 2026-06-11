import { NextResponse } from "next/server"

export async function GET() {
  const key = process.env.RAPIDAPI_KEY || "NOT SET"
  
  try {
    const res = await fetch(
      "https://jsearch.p.rapidapi.com/search?query=software+engineer+United+States&num_pages=1&page=1&country=us&date_posted=week",
      { headers: { 
        "x-rapidapi-host": "jsearch.p.rapidapi.com", 
        "x-rapidapi-key": key 
      }}
    )
    const text = await res.text()
    return NextResponse.json({ 
      status: res.status,
      key_length: key.length,
      key_preview: key.substring(0, 15),
      response_preview: text.substring(0, 200)
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, key_length: key.length })
  }
}