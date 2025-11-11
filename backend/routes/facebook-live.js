const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { db } = require('../server/db');
const { liveStreams } = require('../schema/schema');
const { eq, desc } = require('drizzle-orm');
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
            live_views: liveStream?.viewerCount || Math.floor(Math.random() * 100) + 10,
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

module.exports = router;
