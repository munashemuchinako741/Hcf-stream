import { NextRequest, NextResponse } from 'next/server'

type ArchiveParams = Promise<{ id: string }>

// Base URL for the backend API
const API_BASE_URL =
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://backend:5000' // fallback inside Docker

export async function GET(
  request: NextRequest,
  context: { params: ArchiveParams }
) {
  try {
    // ✅ Next 16 style: params is a Promise, so we await it
    const { id } = await context.params

    // Get token from cookies or headers
    const token =
      request.cookies.get('token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Forward request to Express backend with auth header
    const response = await fetch(`${API_BASE_URL}/api/archive/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // Make sure we don’t cache sensitive data
      cache: 'no-store',
    })

    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Archive video API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
