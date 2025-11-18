import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request, { params }) {
  try {
    // Forward the request to the backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000'
    const token = request.headers.get('authorization')
    const { id } = params

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const response = await fetch(`${backendUrl}/api/admin/schedule/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(error, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
