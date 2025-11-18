const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { db } = require('../server/db');
const { liveStreams } = require('../schema/schema');
const { eq, desc, sql } = require('drizzle-orm');
const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Get live stream status (protected)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Check if HLS playlist exists for the church stream
    const hlsPath = path.join('/tmp', 'hls', 'live', 'church', 'index.m3u8');

    if (fs.existsSync(hlsPath)) {
      // Get file stats to check if stream is active
      const stats = fs.statSync(hlsPath);
      const now = new Date();
      const fileAge = (now - stats.mtime) / 1000; // Age in seconds

      // Consider stream active if playlist was modified within last 30 seconds
      const isActive = fileAge < 30;

      if (isActive) {
        // Get live stream info from database
        const [liveStream] = await db.select().from(liveStreams).where(eq(liveStreams.isLive, true)).limit(1);

        res.json({
          streams: [{
            id: 'church-live',
            title: liveStream?.title || 'Church Live Stream',
            description: liveStream?.description || 'Live broadcast from our sanctuary',
            status: 'LIVE',
            stream_url: `rtmp://nginx:1935/live/church`,
            embed_html: '',
            live_views: liveStream?.viewerCount || 0,
            start_time: liveStream?.startedAt?.toISOString() || stats.mtime.toISOString()
          }]
        });
      } else {
        res.json({ streams: [] });
      }
    } else {
      res.json({ streams: [] });
    }
  } catch (error) {
    console.error('Error checking live stream status:', error);
    res.status(500).json({ error: 'Failed to check stream status' });
  }
});

// Start live stream (protected) - OBS will handle this via RTMP
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { title, description } = req.body;

    // Create or update live stream record
    await db.insert(liveStreams).values({
      title: title || 'Church Live Stream',
      description: description || 'Live broadcast from our sanctuary',
      streamUrl: 'rtmp://nginx:1935/live/church',
      isLive: true,
      startedAt: new Date(),
      viewerCount: 0,
    }).onConflictDoUpdate({
      target: liveStreams.streamUrl,
      set: {
        title: title || 'Church Live Stream',
        description: description || 'Live broadcast from our sanctuary',
        isLive: true,
        startedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    res.json({
      message: 'Live stream started - start broadcasting from OBS to rtmp://nginx:1935/live/church',
      rtmp_url: 'rtmp://nginx:1935/live/church'
    });
  } catch (error) {
    console.error('Error starting live stream:', error);
    res.status(500).json({ error: 'Failed to start live stream' });
  }
});

// Get live stream viewer count (public endpoint for frontend)
router.get('/viewer-count', async (req, res) => {
  try {
    // Get current live stream viewer count
    const [liveStream] = await db.select().from(liveStreams).where(eq(liveStreams.isLive, true)).limit(1);

    if (liveStream) {
      res.json({
        viewerCount: liveStream.viewerCount,
        isLive: true
      });
    } else {
      res.json({
        viewerCount: 0,
        isLive: false
      });
    }
  } catch (error) {
    console.error('Error fetching viewer count:', error);
    res.status(500).json({ error: 'Failed to fetch viewer count' });
  }
});

// Update live stream viewer count (public endpoint for frontend)
router.post('/viewer-count', async (req, res) => {
  try {
    const { action } = req.body; // 'increment' or 'decrement'

    const [liveStream] = await db.select().from(liveStreams).where(eq(liveStreams.isLive, true)).limit(1);

    if (!liveStream) {
      return res.status(404).json({ error: 'No active live stream' });
    }

    let newViewerCount = liveStream.viewerCount;

    if (action === 'increment') {
      newViewerCount = Math.max(0, liveStream.viewerCount + 1);
    } else if (action === 'decrement') {
      newViewerCount = Math.max(0, liveStream.viewerCount - 1);
    }

    await db.update(liveStreams)
      .set({
        viewerCount: newViewerCount,
        updatedAt: new Date()
      })
      .where(eq(liveStreams.id, liveStream.id));

    res.json({
      viewerCount: newViewerCount,
      isLive: true
    });
  } catch (error) {
    console.error('Error updating viewer count:', error);
    res.status(500).json({ error: 'Failed to update viewer count' });
  }
});

// Get current live stream info (public endpoint)
router.get('/current-stream', async (req, res) => {
  try {
    // Check if there's an active live stream
    const [liveStream] = await db.select().from(liveStreams).where(eq(liveStreams.isLive, true)).limit(1);

    if (liveStream) {
      res.json({
        isLive: true,
        title: liveStream.title || 'Church Live Stream',
        description: liveStream.description || 'Live broadcast from our sanctuary',
        speaker: 'Pastor Amos Mkanganwi', // Could be added to schema later
        startTime: liveStream.startedAt?.toISOString(),
        viewerCount: liveStream.viewerCount || 0
      });
    } else {
      // Return default info when no live stream
      res.json({
        isLive: false,
        title: 'No Live Stream',
        description: 'Check back later for upcoming services',
        speaker: '',
        startTime: null,
        viewerCount: 0
      });
    }
  } catch (error) {
    console.error('Error fetching current stream:', error);
    res.status(500).json({ error: 'Failed to fetch current stream' });
  }
});

// Get upcoming events (public endpoint)
router.get('/upcoming-events', async (req, res) => {
  try {
    // Fetch scheduled live streams that are in the future
    const upcomingStreams = await db.select()
      .from(liveStreams)
      .where(sql`${liveStreams.scheduledAt} > NOW()`)
      .orderBy(liveStreams.scheduledAt);

    // Map to the expected event format
    const events = upcomingStreams.map(stream => ({
      id: stream.id.toString(),
      title: stream.title,
      date: new Date(stream.scheduledAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: new Date(stream.scheduledAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      type: 'service' // Default type, could be extended later
    }));

    res.json({ events });
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

module.exports = router;
