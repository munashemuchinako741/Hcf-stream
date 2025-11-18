import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    console.log('[Register] Forwarding to backend:', { name, email })

    const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password }),
    })

    let data: any
    try {
      data = await response.json()
    } catch {
      data = { error: 'Unexpected response from auth service' }
    }

    if (!response.ok) {
      // e.g. 400 validation, 401, 429 rate limit, 500, etc.
      console.warn('[Register] Backend failed:', {
        status: response.status,
        body: data,
      })

      return NextResponse.json(data, { status: response.status })
    }

    console.log('[Register] User created successfully:', { email })

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Registration error in Next route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
