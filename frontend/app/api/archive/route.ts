import { NextRequest, NextResponse } from "next/server"

const API_BASE =
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"

export async function GET(request: NextRequest) {
  try {
    // Extract token from cookies or header
    const cookieToken = request.cookies.get("token")?.value
    const headerToken = request.headers.get("authorization")?.replace("Bearer ", "")
    const token = cookieToken || headerToken

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const backendUrl = `${API_BASE}/api/archive`

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    const text = await response.text()

    // backend returns HTML? avoid JSON parse crash
    let data
    try {
      data = JSON.parse(text)
    } catch {
      console.error("Backend returned non-JSON:", text)
      return NextResponse.json(
        { error: "Invalid backend response" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: response.status })
  } catch (err) {
    console.error("Archive route error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
