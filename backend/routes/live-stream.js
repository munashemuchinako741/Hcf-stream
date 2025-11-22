const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { db } = require('../server/db');
const { liveStreams } = require('../schema/schema');
const { sql } = require('drizzle-orm');

const router = express.Router();

// ====== Config ======
const ANT_MEDIA_SERVER_URL = process.env.ANT_MEDIA_SERVER_URL || 'http://localhost:5080';
const ANT_APP_NAME = process.env.ANT_APP_NAME || 'LiveApp';

// ====== Auth middleware ======
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

// ====== Get current live stream info ======
router.get('/current-stream', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(
      `${ANT_MEDIA_SERVER_URL}/${ANT_APP_NAME}/rest/v2/broadcasts/getLatest`,
      { headers: { Authorization: req.headers['authorization'] } }
    );

    if (response.data && response.data.data) {
      const broadcast = response.data.data;

      return res.json({
        isLive: broadcast.status === 'broadcasting',
        title: broadcast.name,
        description: broadcast.description,
        streamId: broadcast.streamId,
        startTime: broadcast.startTime,
        viewerCount: broadcast.viewerCount,
      });
    }

    return res.json({
      isLive: false,
      title: 'No Live Stream',
      description: '',
      streamId: null,
      startTime: null,
      viewerCount: 0,
    });

  } catch (error) {
    console.error('Error fetching current stream:', error.message);
    return res.status(500).json({ error: 'Failed to fetch current stream info' });
  }
});

// ====== Get viewer count ======
router.get('/viewer-count', async (req, res) => {
  try {
    const response = await axios.get(
      `${ANT_MEDIA_SERVER_URL}/${ANT_APP_NAME}/rest/v2/broadcasts/viewerCount`,
      { headers: { Authorization: req.headers['authorization'] || '' } }
    );

    if (response.data && response.data.data !== undefined) {
      return res.json({
        viewerCount: response.data.data,
        isLive: true,
      });
    }

    return res.json({
      viewerCount: 0,
      isLive: false,
    });

  } catch (error) {
    console.error('Error fetching viewer count:', error.message);
    return res.status(500).json({ error: 'Failed to fetch viewer count' });
  }
});

// ====== Upcoming events ======
router.get('/upcoming-events', async (req, res) => {
  console.log('Received request for /upcoming-events');

  try {
    const upcomingStreams = await db
      .select()
      .from(liveStreams)
      .where(sql`${liveStreams.scheduledAt} > NOW()`)
      .orderBy(liveStreams.scheduledAt);

    console.log(`Fetched ${upcomingStreams.length} upcoming streams from DB`);

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
    }));

    return res.json({ events });

  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    return res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

module.exports = router;
