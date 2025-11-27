const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../server/db');
const { liveStreams, sermons, users } = require('../schema/schema');
const { eq, desc, sql } = require('drizzle-orm');
const router = express.Router();

// Middleware to verify JWT token and check admin role
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = user;
    next();
  });
};

// Get admin dashboard stats
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    // Get total views from all sermons
    const totalViewsResult = await db.select({
      totalViews: sql`SUM(${sermons.viewCount})`
    }).from(sermons);

    const totalViews = totalViewsResult[0]?.totalViews || 0;

    // Get active live stream viewers
    const [liveStream] = await db.select().from(liveStreams).where(eq(liveStreams.isLive, true)).limit(1);
    const activeViewers = liveStream?.viewerCount || 0;

    // Get total streams count
    const totalStreamsResult = await db.select({
      count: sql`COUNT(*)`
    }).from(sermons);

    const totalStreams = totalStreamsResult[0]?.count || 0;

    // Calculate engagement rate (simplified - views per stream)
    const engagementRate = totalStreams > 0 ? ((totalViews / totalStreams) * 100).toFixed(1) : 0;

    // Get recent activity (last 10 events)
    const recentStreams = await db.select({
      id: liveStreams.id,
      title: liveStreams.title,
      type: sql`'stream'`,
      message: sql`CONCAT('Stream ', CASE WHEN ${liveStreams.isLive} THEN 'started' ELSE 'ended' END, ': ', ${liveStreams.title})`,
      timestamp: liveStreams.updatedAt
    }).from(liveStreams).orderBy(desc(liveStreams.updatedAt)).limit(5);

    const recentUsers = await db.select({
      id: users.id,
      username: users.username,
      type: sql`'user'`,
      message: sql`CONCAT('New user registered: ', ${users.username})`,
      timestamp: users.createdAt
    }).from(users).orderBy(desc(users.createdAt)).limit(5);

    // Combine and sort activities
    const activities = [...recentStreams, ...recentUsers]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10)
      .map(activity => ({
        ...activity,
        timestamp: getRelativeTime(activity.timestamp)
      }));

    res.json({
      stats: {
        totalViews: totalViews.toString(),
        activeViewers: activeViewers.toString(),
        totalStreams: totalStreams.toString(),
        engagementRate: `${engagementRate}%`
      },
      activities
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// Stream management endpoints
router.post('/streams/start', authenticateAdmin, async (req, res) => {
  try {
    const { title, description } = req.body;

    // End any existing live streams
    await db.update(liveStreams)
      .set({ isLive: false, endedAt: new Date() })
      .where(eq(liveStreams.isLive, true));

    // Create new live stream
    const [newStream] = await db.insert(liveStreams).values({
      title: title || 'Live Stream',
      description: description || 'Live broadcast',
      streamUrl: 'rtmp://nginx:1935/live/church',
      isLive: true,
      startedAt: new Date(),
      viewerCount: 0,
    }).returning();

    res.json({
      message: 'Stream started successfully',
      stream: newStream,
      rtmpUrl: 'rtmp://nginx:1935/live/church',
      hlsUrl: '/hls/live/church/index.m3u8'
    });
  } catch (error) {
    console.error('Error starting stream:', error);
    res.status(500).json({ error: 'Failed to start stream' });
  }
});

router.post('/streams/stop', authenticateAdmin, async (req, res) => {
  try {
    const [liveStream] = await db.select().from(liveStreams)
      .where(eq(liveStreams.isLive, true)).limit(1);

    if (!liveStream) {
      return res.status(404).json({ error: 'No active stream found' });
    }

    await db.update(liveStreams)
      .set({
        isLive: false,
        endedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(liveStreams.id, liveStream.id));

    res.json({ message: 'Stream stopped successfully' });
  } catch (error) {
    console.error('Error stopping stream:', error);
    res.status(500).json({ error: 'Failed to stop stream' });
  }
});

router.get('/streams/status', authenticateAdmin, async (req, res) => {
  try {
    const [liveStream] = await db.select().from(liveStreams)
      .where(eq(liveStreams.isLive, true)).limit(1);

    if (!liveStream) {
      return res.json({ isLive: false, stream: null });
    }

    // Calculate duration
    const duration = Math.floor((new Date() - new Date(liveStream.startedAt)) / 1000);

    res.json({
      isLive: true,
      stream: {
        id: liveStream.id,
        title: liveStream.title,
        description: liveStream.description,
        startedAt: liveStream.startedAt,
        viewerCount: liveStream.viewerCount,
        duration: formatDuration(duration)
      }
    });
  } catch (error) {
    console.error('Error getting stream status:', error);
    res.status(500).json({ error: 'Failed to get stream status' });
  }
});

// User management endpoints
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      username: users.username,
      role: users.role,
      isApproved: users.isApproved,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    }).from(users).orderBy(desc(users.createdAt));

    res.json({ users: allUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.patch('/users/:id/approve', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;

    const [updatedUser] = await db.update(users)
      .set({
        isApproved,
        updatedAt: new Date()
      })
      .where(eq(users.id, parseInt(id)))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: `User ${isApproved ? 'approved' : 'unapproved'} successfully`,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user approval:', error);
    res.status(500).json({ error: 'Failed to update user approval' });
  }
});

router.patch('/users/:id/role', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' });
    }

    const [updatedUser] = await db.update(users)
      .set({
        role,
        updatedAt: new Date()
      })
      .where(eq(users.id, parseInt(id)))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: `User role updated to ${role} successfully`,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Schedule management endpoints
router.get('/schedule', authenticateAdmin, async (req, res) => {
  try {
    // For now, return scheduled live streams
    const scheduledStreams = await db.select()
      .from(liveStreams)
      .where(sql`${liveStreams.scheduledAt} > NOW()`)
      .orderBy(liveStreams.scheduledAt);

    res.json({ events: scheduledStreams });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

router.post('/schedule', authenticateAdmin, async (req, res) => {
  try {
    const { title, description, scheduledAt } = req.body;

    const [newEvent] = await db.insert(liveStreams).values({
      title,
      description,
      scheduledAt: new Date(scheduledAt),
      streamUrl: 'rtmp://nginx:1935/live/church',
      isLive: false,
      viewerCount: 0,
    }).returning();

    res.json({
      message: 'Event scheduled successfully',
      event: newEvent
    });
  } catch (error) {
    console.error('Error scheduling event:', error);
    res.status(500).json({ error: 'Failed to schedule event' });
  }
});

router.delete('/schedule/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await db.delete(liveStreams).where(eq(liveStreams.id, parseInt(id)));

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Helper functions
function getRelativeTime(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  return `${days} days ago`;
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// ===============================
// AWS S3 UPLOAD (FINAL VERSION)
// ===============================
const { S3Client } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3-v3");
const path = require("path");

// Create S3 client (AWS SDK v3)
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});


const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      const filename = `sermons/${Date.now()}${ext}`;
      cb(null, filename);
    }
  }),
  limits: { fileSize: 600 * 1024 * 1024 }, // 600MB max file size
});
  

// ===============================
// UPLOAD ROUTE (FINAL)
// ===============================
router.post(
  "/upload",
  authenticateAdmin,
  upload.single("video"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No video file received" });
      }

      const { title, description, speaker, series, category } = req.body;

      // S3 public URL
      const videoUrl = req.file.location;

      // Save into database
      const [newSermon] = await db.insert(sermons).values({
        title: title || "Untitled",
        description: description || "",
        speaker: speaker || "",
        series: series || "",
        category: category || "Other",
        videoUrl,
        viewCount: 0,
        isPublished: true,           // <-- FIX
        publishedAt: new Date(),  
        createdAt: new Date(),
      }).returning();

      return res.json({
        message: "Video uploaded to S3 successfully!",
        sermon: newSermon,
        videoUrl,
      });

    } catch (error) {
      console.error("S3 Upload Error:", error);
      return res.status(500).json({ error: "Failed to upload video to S3" });
    }
  }
);

module.exports = router;
