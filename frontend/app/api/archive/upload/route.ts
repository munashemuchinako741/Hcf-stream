import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const API_BASE =
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://backend:5000' // fallback inside Docker

export async function POST(request: NextRequest) {
  try {
    // Get token from cookies or headers
    const token = request.cookies.get('token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 })
    }

    // Verify authentication by calling backend
    const verifyResponse = await fetch(`${API_BASE}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!verifyResponse.ok) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const user = await verifyResponse.json()
    if (!user.user || user.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('video') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const speaker = formData.get('speaker') as string
    const series = formData.get('series') as string
    const category = formData.get('category') as string

    if (!file || !title) {
      return NextResponse.json({ error: 'Video file and title are required' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'Invalid file type. Only video files are allowed.' }, { status: 400 })
    }

    // Validate file size (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 500MB' }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const filename = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filepath = join(process.cwd(), 'uploads', filename)

    // Ensure uploads directory exists
    await mkdir(join(process.cwd(), 'uploads'), { recursive: true })

    // Save file temporarily
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // TODO: Insert video record into database and trigger processing
    // For now, just return success with file info
    console.log('Video uploaded:', {
      filename,
      filepath,
      title,
      description,
      speaker,
      series,
      category,
      uploadedBy: user.user.id
    })

    return NextResponse.json({
      success: true,
      video: {
        id: Date.now(), // Temporary ID
        title,
        filename,
        status: 'processing',
        message: 'Video uploaded successfully. Processing will begin shortly.'
      }
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
