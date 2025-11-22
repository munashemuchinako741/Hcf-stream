import { NextResponse } from 'next/server'

export async function GET() {
  // Forward the request to the backend
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000'
  const apiUrl = `${backendUrl}/api/live-stream/upcoming-events`

  try {
    const response = await fetch(apiUrl)

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch upcoming events' }, { status: response.status })
    }

    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
