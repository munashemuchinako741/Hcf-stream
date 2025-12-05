const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { db } = require('../server/db');
const { liveStreams } = require('../schema/schema');
const { sql } = require('drizzle-orm');

const router = express.Router();

// ====== Config ======
const SRS_SERVER_URL = process.env.SRS_SERVER_URL || 'http://54.227.11.207:1985';
const SRS_HLS_URL = process.env.SRS_HLS_URL || 'http://54.227.11.207:8080';
const SRS_APP_NAME = process.env.SRS_APP_NAME || 'live';
const STREAM_KEY = process.env.STREAM_KEY || 'church_ssl'; // Changed to church_ssl

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

// ====== Helper function to get stream info from SRS ======
const getSRSStreamInfo = async (streamKey = STREAM_KEY) => {
  try {
    // Try to get stream info from SRS API
    const response = await axios.get(`${SRS_SERVER_URL}/api/v1/streams`);
    
    if (response.data && response.data.streams) {
      // Find the specific stream by name
      const stream = response.data.streams.find(
        s => s.name === streamKey || s.stream === streamKey
      );
      
      if (stream) {
        return {
          isLive: stream.publish && stream.publish.active === true,
          title: stream.name || stream.stream || 'Live Stream',
          description: 'Live stream from SRS server',
          streamId: stream.stream || stream.name,
          startTime: stream.publish_time || Date.now(),
          viewerCount: stream.clients || 0,
          video: stream.video || {},
          audio: stream.audio || {},
          bitrate: stream.kbps || 0,
        };
      }
    }
    
    // Check multiple stream types
    const streamTypes = ['.m3u8', '.flv'];
    for (const type of streamTypes) {
      try {
        const streamResponse = await axios.head(`${SRS_HLS_URL}/live/${streamKey}${type}`, {
          timeout: 3000
        });
        
        if (streamResponse.status === 200) {
          return {
            isLive: true,
            title: 'Live Stream',
            description: 'Live stream from SRS server',
            streamId: streamKey,
            startTime: Date.now(),
            viewerCount: 0,
            hasFlv: type === '.flv',
            hasHls: type === '.m3u8',
          };
        }
      } catch (streamError) {
        // Continue to next type
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching SRS stream info:', error.message);
    return null;
  }
};

// ====== Get current live stream info ======
router.get('/current-stream', authenticateToken, async (req, res) => {
  try {
    const streamKey = req.query.streamKey || STREAM_KEY;
    const streamInfo = await getSRSStreamInfo(streamKey);
    
    if (streamInfo) {
      return res.json({
        isLive: streamInfo.isLive,
        title: streamInfo.title,
        description: streamInfo.description,
        streamId: streamInfo.streamId,
        startTime: streamInfo.startTime,
        viewerCount: streamInfo.viewerCount,
        bitrate: streamInfo.bitrate || 0,
        hasFlv: streamInfo.hasFlv || false,
        hasHls: streamInfo.hasHls || false,
      });
    }

    return res.json({
      isLive: false,
      title: 'No Live Stream',
      description: '',
      streamId: null,
      startTime: null,
      viewerCount: 0,
      bitrate: 0,
      hasFlv: false,
      hasHls: false,
    });

  } catch (error) {
    console.error('Error fetching current stream:', error.message);
    return res.status(500).json({ error: 'Failed to fetch current stream info' });
  }
});

// ====== Get stream id (secure) ======
router.get('/stream-id', authenticateToken, async (req, res) => {
  try {
    const streamKey = req.query.streamKey || STREAM_KEY;
    const streamInfo = await getSRSStreamInfo(streamKey);
    
    if (streamInfo && streamInfo.isLive) {
      return res.json({ 
        streamId: streamInfo.streamId,
        hlsUrl: `${SRS_HLS_URL}/live/${streamInfo.streamId}.m3u8`,
        flvUrl: `${SRS_HLS_URL}/live/${streamInfo.streamId}.flv`,
        whepUrl: `${SRS_SERVER_URL}/rtc/v1/whep/?app=${SRS_APP_NAME}&stream=${streamInfo.streamId}`,
      });
    }

    // Return URLs even if stream is offline
    return res.json({ 
      streamId: streamKey,
      hlsUrl: `${SRS_HLS_URL}/live/${streamKey}.m3u8`,
      flvUrl: `${SRS_HLS_URL}/live/${streamKey}.flv`,
      whepUrl: `${SRS_SERVER_URL}/rtc/v1/whep/?app=${SRS_APP_NAME}&stream=${streamKey}`,
    });

  } catch (error) {
    console.error('Error fetching stream id:', error.message || error);
    return res.status(500).json({ error: 'Failed to fetch stream id' });
  }
});

// ====== Get viewer count ======
router.get('/viewer-count', async (req, res) => {
  try {
    const streamKey = req.query.streamKey || STREAM_KEY;
    const streamInfo = await getSRSStreamInfo(streamKey);
    
    if (streamInfo) {
      return res.json({
        viewerCount: streamInfo.viewerCount,
        isLive: streamInfo.isLive,
        streamId: streamInfo.streamId,
      });
    }

    return res.json({
      viewerCount: 0,
      isLive: false,
      streamId: streamKey,
    });

  } catch (error) {
    console.error('Error fetching viewer count:', error.message);
    return res.status(500).json({ error: 'Failed to fetch viewer count' });
  }
});

// ====== Get stream statistics ======
router.get('/stream-stats', authenticateToken, async (req, res) => {
  try {
    const streamKey = req.query.streamKey || STREAM_KEY;
    const streamInfo = await getSRSStreamInfo(streamKey);
    
    if (streamInfo) {
      return res.json({
        isLive: streamInfo.isLive,
        streamId: streamInfo.streamId,
        bitrate: streamInfo.bitrate || 0,
        viewerCount: streamInfo.viewerCount,
        video: streamInfo.video || { codec: 'unknown', width: 0, height: 0 },
        audio: streamInfo.audio || { codec: 'unknown', sample_rate: 0, channels: 0 },
        startTime: streamInfo.startTime,
        uptime: streamInfo.startTime ? Date.now() - streamInfo.startTime : 0,
        hasFlv: streamInfo.hasFlv || false,
        hasHls: streamInfo.hasHls || false,
      });
    }

    return res.json({
      isLive: false,
      streamId: streamKey,
      bitrate: 0,
      viewerCount: 0,
      video: { codec: 'unknown', width: 0, height: 0 },
      audio: { codec: 'unknown', sample_rate: 0, channels: 0 },
      startTime: null,
      uptime: 0,
      hasFlv: true, // Assuming FLV is always available
      hasHls: true, // Assuming HLS is always available
    });

  } catch (error) {
    console.error('Error fetching stream stats:', error.message);
    return res.status(500).json({ error: 'Failed to fetch stream statistics' });
  }
});

// ====== Get available stream qualities ======
router.get('/stream-qualities', authenticateToken, async (req, res) => {
  try {
    const streamKey = req.query.streamKey || STREAM_KEY;
    
    const qualities = [
      { id: 'auto', name: 'Auto', bandwidth: 0 },
      { id: '1080p', name: '1080p HD', bandwidth: 5000000 },
      { id: '720p', name: '720p HD', bandwidth: 2500000 },
      { id: '480p', name: '480p', bandwidth: 1000000 },
      { id: '360p', name: '360p', bandwidth: 500000 },
      { id: '240p', name: '240p', bandwidth: 250000 },
    ];

    return res.json({
      streamId: streamKey,
      qualities: qualities,
      recommended: 'auto',
      supportsAdaptive: true,
    });

  } catch (error) {
    console.error('Error fetching stream qualities:', error.message);
    return res.status(500).json({ error: 'Failed to fetch stream qualities' });
  }
});

// ====== Get stream endpoints ======
router.get('/stream-endpoints', authenticateToken, async (req, res) => {
  try {
    const streamKey = req.query.streamKey || STREAM_KEY;
    const streamInfo = await getSRSStreamInfo(streamKey);
    const isLive = streamInfo ? streamInfo.isLive : false;
    
    const endpoints = {
      streamId: streamKey,
      isLive: isLive,
      protocols: {
        webrtc: {
          url: `${SRS_SERVER_URL}/rtc/v1/whep/?app=${SRS_APP_NAME}&stream=${streamKey}`,
          enabled: true,
          lowLatency: true,
        },
        hls: {
          url: `${SRS_HLS_URL}/live/${streamKey}.m3u8`,
          enabled: true,
          lowLatency: false,
        },
        flv: {
          url: `${SRS_HLS_URL}/live/${streamKey}.flv`,
          enabled: true,
          lowLatency: false,
        },
        rtmp: {
          url: `rtmp://${SRS_SERVER_URL.replace('http://', '')}/live/${streamKey}`,
          enabled: true,
          lowLatency: false,
        },
      },
      recommendedProtocol: isLive ? 'webrtc' : 'flv',
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    };

    return res.json(endpoints);

  } catch (error) {
    console.error('Error fetching stream endpoints:', error.message);
    return res.status(500).json({ error: 'Failed to fetch stream endpoints' });
  }
});

// ====== Get all available streams ======
router.get('/available-streams', authenticateToken, async (req, res) => {
  try {
    // Try to get all streams from SRS API
    const response = await axios.get(`${SRS_SERVER_URL}/api/v1/streams`);
    
    if (response.data && response.data.streams) {
      const streams = response.data.streams.map(stream => ({
        id: stream.stream || stream.name,
        name: stream.name || stream.stream,
        isLive: stream.publish && stream.publish.active === true,
        viewerCount: stream.clients || 0,
        bitrate: stream.kbps || 0,
        video: stream.video || {},
        audio: stream.audio || {},
      }));
      
      return res.json({
        streams: streams,
        total: streams.length,
        server: SRS_SERVER_URL,
      });
    }

    return res.json({
      streams: [
        {
          id: STREAM_KEY,
          name: 'Church Service',
          isLive: false,
          viewerCount: 0,
          bitrate: 0,
        }
      ],
      total: 1,
      server: SRS_SERVER_URL,
    });

  } catch (error) {
    console.error('Error fetching available streams:', error.message);
    return res.status(500).json({ error: 'Failed to fetch available streams' });
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
      streamId: stream.streamId || STREAM_KEY,
      description: stream.description || '',
    }));

    return res.json({ events });

  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    return res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

// ====== Start stream (admin only) ======
router.post('/start-stream', authenticateToken, async (req, res) => {
  try {
    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { title, description, scheduledAt, streamId = STREAM_KEY } = req.body;
    
    // Create a new stream event in the database
    const [newStream] = await db.insert(liveStreams).values({
      title: title || 'Live Stream',
      description: description || '',
      streamId: streamId,
      scheduledAt: scheduledAt || new Date(),
      status: 'scheduled',
      createdBy: req.user.id,
    }).returning();

    return res.json({
      message: 'Stream scheduled successfully',
      stream: {
        id: newStream.id,
        title: newStream.title,
        streamId: newStream.streamId,
        scheduledAt: newStream.scheduledAt,
      },
    });

  } catch (error) {
    console.error('Error scheduling stream:', error.message);
    return res.status(500).json({ error: 'Failed to schedule stream' });
  }
});

// ====== Check stream health ======
router.get('/health-check', async (req, res) => {
  try {
    // Check SRS server health
    const srsResponse = await axios.get(`${SRS_SERVER_URL}/api/v1/versions`, {
      timeout: 5000,
    });
    
    const streamInfo = await getSRSStreamInfo();
    
    return res.json({
      status: 'healthy',
      srs: {
        version: srsResponse.data.data || 'unknown',
        status: 'running',
      },
      stream: {
        isLive: streamInfo ? streamInfo.isLive : false,
        streamId: STREAM_KEY,
        hasFlv: streamInfo ? streamInfo.hasFlv || false : true,
        hasHls: streamInfo ? streamInfo.hasHls || false : true,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Health check failed:', error.message);
    return res.status(503).json({
      status: 'unhealthy',
      error: 'SRS server unavailable',
      timestamp: new Date().toISOString(),
    });
  }
});

// ====== Stream test endpoint (no auth required) ======
router.get('/test-stream', async (req, res) => {
  try {
    const streamKey = req.query.streamKey || STREAM_KEY;
    const streamTypes = ['.m3u8', '.flv'];
    const results = {};
    
    for (const type of streamTypes) {
      try {
        const response = await axios.head(`${SRS_HLS_URL}/live/${streamKey}${type}`, {
          timeout: 5000
        });
        results[type] = {
          available: response.status === 200,
          url: `${SRS_HLS_URL}/live/${streamKey}${type}`
        };
      } catch (error) {
        results[type] = {
          available: false,
          url: `${SRS_HLS_URL}/live/${streamKey}${type}`,
          error: error.message
        };
      }
    }
    
    // Test WebRTC endpoint
    try {
      const webrtcResponse = await axios.head(`${SRS_SERVER_URL}/rtc/v1/whep/?app=${SRS_APP_NAME}&stream=${streamKey}`, {
        timeout: 5000
      });
      results['webrtc'] = {
        available: webrtcResponse.status === 200,
        url: `${SRS_SERVER_URL}/rtc/v1/whep/?app=${SRS_APP_NAME}&stream=${streamKey}`
      };
    } catch (error) {
      results['webrtc'] = {
        available: false,
        url: `${SRS_SERVER_URL}/rtc/v1/whep/?app=${SRS_APP_NAME}&stream=${streamKey}`,
        error: error.message
      };
    }
    
    return res.json({
      streamKey: streamKey,
      server: SRS_SERVER_URL,
      results: results,
      summary: {
        flvAvailable: results['.flv']?.available || false,
        hlsAvailable: results['.m3u8']?.available || false,
        webrtcAvailable: results['webrtc']?.available || false
      }
    });

  } catch (error) {
    console.error('Stream test failed:', error.message);
    return res.status(500).json({ error: 'Stream test failed', message: error.message });
  }
});

module.exports = router;