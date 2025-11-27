import { NextRequest, NextResponse } from "next/server"

type ArchiveParams = Promise<{ id: string }>

// Backend URL
const API_BASE_URL =
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"

export async function GET(
  request: NextRequest,
  context: { params: ArchiveParams }
) {
  try {
    const { id } = await context.params

    // Get token from cookies or headers
    const cookieToken = request.cookies.get("token")?.value
    const headerToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "")
    const token = cookieToken || headerToken

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const backendUrl = `${API_BASE_URL}/api/archive/${id}`

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    const text = await response.text()

    // Avoid "Unexpected token '<'" crash
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
  } catch (error) {
    console.error("Archive video API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
