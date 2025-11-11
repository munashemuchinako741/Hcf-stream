const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../server/db');
const { sermons } = require('../schema/schema');
const { eq } = require('drizzle-orm');
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

module.exports = router;
