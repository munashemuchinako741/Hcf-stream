const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../server/db');
const { sermons } = require('../schema/schema');
const { eq } = require('drizzle-orm');
const { upload } = require('../config/s3-v3');
const videoProcessor = require('../services/videoProcessor');
const { authLimiter } = require('../middleware/rateLimiter');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
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

// Enhanced file validation middleware
const validateVideoUpload = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),

  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),

  body('speaker')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Speaker name must be less than 100 characters'),

  body('series')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Series name must be less than 100 characters'),

  body('category')
    .optional()
    .isIn(['Sunday Service', 'Special Event', 'Bible Study', 'Youth Service', 'Prayer Meeting', 'Other'])
    .withMessage('Invalid category'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Custom file validation middleware
const validateVideoFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided' });
  }

  // Check file size (500MB limit)
  const maxSize = 500 * 1024 * 1024; // 500MB
  if (req.file.size > maxSize) {
    return res.status(400).json({ error: 'File size exceeds 500MB limit' });
  }

  // Check MIME type
  const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ error: 'Invalid file type. Only video files are allowed.' });
  }

  // Check file extension matches MIME type
  const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
  const extensionMap = {
    'mp4': 'video/mp4',
    'avi': 'video/avi',
    'mov': 'video/quicktime',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    'webm': 'video/webm',
    'mkv': 'video/x-matroska'
  };

  if (extensionMap[fileExtension] !== req.file.mimetype) {
    return res.status(400).json({ error: 'File extension does not match file type' });
  }

  // Basic content validation - check if file starts with video signature
  const buffer = req.file.buffer;
  if (buffer.length < 12) {
    return res.status(400).json({ error: 'File is too small to be a valid video' });
  }

  // Check for common video file signatures
  const signatures = [
    Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]), // MP4
    Buffer.from([0x52, 0x49, 0x46, 0x46]), // AVI
    Buffer.from([0x1A, 0x45, 0xDF, 0xA3]), // WebM/MKV
  ];

  const hasValidSignature = signatures.some(signature =>
    buffer.slice(0, signature.length).equals(signature)
  );

  if (!hasValidSignature) {
    return res.status(400).json({ error: 'File does not appear to be a valid video file' });
  }

  next();
};

// Get archived videos (protected)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const videos = await db.select().from(sermons).where(eq(sermons.isPublished, true));
    res.json({ videos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific video (protected)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [video] = await db.select().from(sermons).where(eq(sermons.id, parseInt(id))).limit(1);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    res.json({ video });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload video (protected, admin only)
router.post('/upload', authLimiter, authenticateToken, validateVideoUpload, upload.single('video'), validateVideoFile, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const { title, description, speaker, series, category } = req.body;

    // Get video duration
    const duration = await videoProcessor.getVideoDuration(req.file.location);

    // Generate thumbnail
    const thumbnailUrl = await videoProcessor.generateThumbnail(req.file.location, req.file.key);

    // Transcode video to multiple resolutions
    const transcodedVersions = await videoProcessor.transcodeVideo(req.file.location, req.file.key);

    // Save to database
    const [newSermon] = await db.insert(sermons).values({
      title,
      description,
      speaker,
      series,
      videoUrl: req.file.location,
      thumbnailUrl,
      duration,
      category,
      transcodedVersions: JSON.stringify(transcodedVersions),
      isPublished: false, // Admin needs to review before publishing
    }).returning();

    res.status(201).json({
      message: 'Video uploaded and processed successfully',
      video: newSermon
    });
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ error: 'Failed to upload video: ' + error.message });
  }
});

// Update video (publish/unpublish)
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { isPublished } = req.body;

    const [updatedVideo] = await db.update(sermons)
      .set({
        isPublished,
        publishedAt: isPublished ? new Date() : null
      })
      .where(eq(sermons.id, parseInt(id)))
      .returning();

    if (!updatedVideo) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({ video: updatedVideo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete video (protected, admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    // Get video info before deleting
    const [video] = await db.select().from(sermons).where(eq(sermons.id, parseInt(id))).limit(1);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Delete from database
    await db.delete(sermons).where(eq(sermons.id, parseInt(id)));

    // TODO: Delete files from S3 (optional - can be done asynchronously)

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
