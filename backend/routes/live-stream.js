const express = require('express')
const jwt = require('jsonwebtoken')
const fs = require('fs')
const path = require('path')
const { db } = require('../server/db')
const { liveStreams } = require('../schema/schema')
const { eq, sql } = require('drizzle-orm')

const router = express.Router()

// ====== Config ======
const STREAM_KEY = process.env.LIVE_STREAM_KEY || 'church'
const RTMP_HOST = process.env.RTMP_HOST || 'nginx'          // docker service name
const RTMP_PORT = process.env.RTMP_PORT || '1935'
const RTMP_URL = `rtmp://${RTMP_HOST}:${RTMP_PORT}/live/${STREAM_KEY}`

// HLS playlist path inside container
// For nginx: hls_path /tmp/hls/live;  => /tmp/hls/live/<stream>.m3u8
const HLS_PLAYLIST_PATH =
  process.env.HLS_PLAYLIST_PATH ||
  path.join('/tmp', 'hls', 'live', `${STREAM_KEY}.m3u8`)

// ====== Auth middleware ======
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' })
    }
    req.user = user
    next()
  })
}

// ====== Get live stream status (protected) ======
router.get('/', authenticateToken, async (req, res) => {
  try {
    // 1) Check if playlist exists
    if (!fs.existsSync(HLS_PLAYLIST_PATH)) {
      return res.json({ streams: [] })
    }

    const stats = fs.statSync(HLS_PLAYLIST_PATH)
    const now = new Date()
    const fileAge = (now - stats.mtime) / 1000 // seconds

    // Consider stream active if playlist touched in last 30s
    const isActive = fileAge < 30

    if (!isActive) {
      return res.json({ streams: [] })
    }

    // 2) Get live stream info from DB
    const [liveStream] = await db
      .select()
      .from(liveStreams)
      .where(eq(liveStreams.isLive, true))
      .limit(1)

    res.json({
      streams: [
        {
          id: 'church-live',
          title: liveStream?.title || 'Church Live Stream',
          description:
            liveStream?.description || 'Live broadcast from our sanctuary',
          status: 'LIVE',
          stream_url: RTMP_URL,
          embed_html: '',
          live_views: liveStream?.viewerCount || 0,
          start_time:
            liveStream?.startedAt?.toISOString() || stats.mtime.toISOString(),
        },
      ],
    })
  } catch (error) {
    console.error('Error checking live stream status:', error)
    res.status(500).json({ error: 'Failed to check stream status' })
  }
})

// ====== Start live stream (protected) ======
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { title, description } = req.body

    await db
      .insert(liveStreams)
      .values({
        title: title || 'Church Live Stream',
        description: description || 'Live broadcast from our sanctuary',
        streamUrl: RTMP_URL,
        isLive: true,
        startedAt: new Date(),
        viewerCount: 0,
      })
      .onConflictDoUpdate({
        target: liveStreams.streamUrl,
        set: {
          title: title || 'Church Live Stream',
          description:
            description || 'Live broadcast from our sanctuary',
          isLive: true,
          startedAt: new Date(),
          updatedAt: new Date(),
        },
      })

    res.json({
      message:
        `Live stream started - start broadcasting from OBS to ${RTMP_URL}`,
      rtmp_url: RTMP_URL,
    })
  } catch (error) {
    console.error('Error starting live stream:', error)
    res.status(500).json({ error: 'Failed to start live stream' })
  }
})

// ====== Viewer count (public) ======
router.get('/viewer-count', async (req, res) => {
  try {
    const [liveStream] = await db
      .select()
      .from(liveStreams)
      .where(eq(liveStreams.isLive, true))
      .limit(1)

    if (liveStream) {
      res.json({
        viewerCount: liveStream.viewerCount,
        isLive: true,
      })
    } else {
      res.json({
        viewerCount: 0,
        isLive: false,
      })
    }
  } catch (error) {
    console.error('Error fetching viewer count:', error)
    res.status(500).json({ error: 'Failed to fetch viewer count' })
  }
})

router.post('/viewer-count', async (req, res) => {
  try {
    const { action } = req.body // 'increment' or 'decrement'

    const [liveStream] = await db
      .select()
      .from(liveStreams)
      .where(eq(liveStreams.isLive, true))
      .limit(1)

    if (!liveStream) {
      return res.status(404).json({ error: 'No active live stream' })
    }

    let newViewerCount = liveStream.viewerCount

    if (action === 'increment') {
      newViewerCount = Math.max(0, liveStream.viewerCount + 1)
    } else if (action === 'decrement') {
      newViewerCount = Math.max(0, liveStream.viewerCount - 1)
    }

    await db
      .update(liveStreams)
      .set({
        viewerCount: newViewerCount,
        updatedAt: new Date(),
      })
      .where(eq(liveStreams.id, liveStream.id))

    res.json({
      viewerCount: newViewerCount,
      isLive: true,
    })
  } catch (error) {
    console.error('Error updating viewer count:', error)
    res.status(500).json({ error: 'Failed to update viewer count' })
  }
})

// ====== Current live stream info (public) ======
router.get('/current-stream', async (req, res) => {
  try {
    const [liveStream] = await db
      .select()
      .from(liveStreams)
      .where(eq(liveStreams.isLive, true))
      .limit(1)

    if (liveStream) {
      res.json({
        isLive: true,
        title: liveStream.title || 'Church Live Stream',
        description:
          liveStream.description || 'Live broadcast from our sanctuary',
        speaker: 'Pastor Amos Mkanganwi',
        startTime: liveStream.startedAt?.toISOString() || null,
        viewerCount: liveStream.viewerCount || 0,
      })
    } else {
      res.json({
        isLive: false,
        title: 'No Live Stream',
        description: 'Check back later for upcoming services',
        speaker: '',
        startTime: null,
        viewerCount: 0,
      })
    }
  } catch (error) {
    console.error('Error fetching current stream:', error)
    res.status(500).json({ error: 'Failed to fetch current stream' })
  }
})

// ====== Upcoming events (public) ======
router.get('/upcoming-events', async (req, res) => {
  try {
    const upcomingStreams = await db
      .select()
      .from(liveStreams)
      .where(sql`${liveStreams.scheduledAt} > NOW()`)
      .orderBy(liveStreams.scheduledAt)

    const events = upcomingStreams.map((stream) => ({
      id: stream.id.toString(),
      title: stream.title,
      date: new Date(stream.scheduledAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: new Date(stream.scheduledAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      type: 'service',
    }))

    res.json({ events })
  } catch (error) {
    console.error('Error fetching upcoming events:', error)
    res.status(500).json({ error: 'Failed to fetch upcoming events' })
  }
})

module.exports = router
