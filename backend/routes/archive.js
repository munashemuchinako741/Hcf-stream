const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../server/db');
const { sermons } = require('../schema/schema');
const { eq } = require('drizzle-orm');
const { upload } = require('../config/s3-v3');
const videoProcessor = require('../services/videoProcessor');
const { authLimiter } = require('../middleware/rateLimiter');
const { body, validationResult } = require('express-validator');

const router = express.Router();

/* ===============================
   AUTH MIDDLEWARE
================================*/
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};

/* ===============================
   VALIDATION MIDDLEWARE
================================*/
const validateVideoUpload = [
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('description').optional().isLength({ max: 1000 }),
  body('speaker').optional().isLength({ max: 100 }),
  body('series').optional().isLength({ max: 100 }),
  body('category')
    .optional()
    .isIn(['Sunday Service', 'Special Event', 'Bible Study', 'Youth Service', 'Prayer Meeting', 'Other']),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ error: "Validation failed", details: errors.array() });
    next();
  }
];

/* ===============================
   FILE VALIDATION
================================*/
const validateVideoFile = (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: "No video file provided" });
  next();
};

/* ===============================
   GET ALL PUBLISHED VIDEOS
   Route: /api/admin/archive
================================*/
router.get('/', authenticateToken, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(sermons)
      .where(eq(sermons.isPublished, true));

    const videos = rows.map(v => ({
      id: v.id,
      title: v.title,
      description: v.description,
      speaker: v.speaker,
      series: v.series,
      category: v.category,
      videoUrl: v.videoUrl,
      thumbnailUrl: v.thumbnailUrl,
      duration: v.duration,
      transcodedVersions: v.transcodedVersions ? JSON.parse(v.transcodedVersions) : [],
      createdAt: v.createdAt,
      publishedAt: v.publishedAt
    }));

    res.json({ videos });
  } catch (err) {
    res.status(500).json({ error: "Failed to load archive" });
  }
});

/* ===============================
   GET SINGLE VIDEO
   Route: /api/admin/archive/:id
================================*/
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await db
      .select()
      .from(sermons)
      .where(eq(sermons.id, Number(id)))
      .limit(1);

    if (rows.length === 0)
      return res.status(404).json({ error: "Video not found" });

    const v = rows[0];

    res.json({
      video: {
        id: v.id,
        title: v.title,
        description: v.description,
        speaker: v.speaker,
        series: v.series,
        category: v.category,
        videoUrl: v.videoUrl,
        thumbnailUrl: v.thumbnailUrl,
        duration: v.duration,
        transcodedVersions: v.transcodedVersions ? JSON.parse(v.transcodedVersions) : [],
        createdAt: v.createdAt,
        publishedAt: v.publishedAt
      }
    });

  } catch (err) {
    res.status(500).json({ error: "Failed to load video" });
  }
});

/* ===============================
   GET RELATED VIDEOS
   Route: /api/archive/related/:id
================================*/
router.get('/related/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get current video
    const rows = await db
      .select()
      .from(sermons)
      .where(eq(sermons.id, Number(id)))
      .limit(1);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Video not found" });
    }

    const current = rows[0];

    // Query related videos by same category first
    let related = await db
      .select()
      .from(sermons)
      .where(eq(sermons.category, current.category))
      .limit(10);

    // Remove current video from list
    related = related.filter((v) => v.id !== Number(id));

    // If less than 3 found → fallback recent videos
    if (related.length < 3) {
      const fallback = await db
        .select()
        .from(sermons)
        .limit(10);

      const merged = [...related, ...fallback];
      related = merged.filter((v, index, arr) => v.id !== Number(id) && index < 3);
    } else {
      related = related.slice(0, 3);
    }

    const formatted = related.map(v => ({
      id: v.id,
      title: v.title,
      speaker: v.speaker,
      duration: v.duration,
      thumbnailUrl: v.thumbnailUrl,
      category: v.category,
      createdAt: v.createdAt
    }));

    res.json({ related: formatted });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load related videos" });
  }
});


/* ===============================
   UPLOAD VIDEO (ADMIN ONLY)
   Route: /api/admin/archive/upload
================================*/
router.post(
  '/upload',
  authLimiter,
  authenticateToken,
  validateVideoUpload,
  upload.single('video'),
  validateVideoFile,
  async (req, res) => {
    try {
      if (req.user.role !== "admin")
        return res.status(403).json({ error: "Admin access required" });

      const { title, description, speaker, series, category } = req.body;

      const videoUrl = req.file.location;
      const s3Key = req.file.key;

      const duration = await videoProcessor.getVideoDuration(videoUrl);
      const thumbnailUrl = await videoProcessor.generateThumbnail(videoUrl, s3Key);
      const transcodedVersions = await videoProcessor.transcodeVideo(videoUrl, s3Key);

      const [newSermon] = await db.insert(sermons).values({
        title,
        description,
        speaker,
        series,
        category,
        videoUrl,
        thumbnailUrl,
        duration,
        transcodedVersions: JSON.stringify(transcodedVersions),
        isPublished: false,
        createdAt: new Date()
      }).returning();

      res.status(201).json({
        message: "Video uploaded successfully",
        video: newSermon
      });

    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ error: "Failed to upload video" });
    }
});

/* ===============================
   PUBLISH / UNPUBLISH (ADMIN ONLY)
================================*/
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ error: "Admin access required" });

    const { id } = req.params;
    const { isPublished } = req.body;

    const [updated] = await db.update(sermons)
      .set({
        isPublished,
        publishedAt: isPublished ? new Date() : null
      })
      .where(eq(sermons.id, Number(id)))
      .returning();

    res.json({ video: updated });

  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

/* ===============================
   DELETE VIDEO (ADMIN ONLY)
================================*/
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ error: "Admin access required" });

    const { id } = req.params;

    await db.delete(sermons).where(eq(sermons.id, Number(id)));

    res.json({ message: "Video deleted" });

  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

module.exports = router;
