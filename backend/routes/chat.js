const express = require('express');
const { db } = require('../server/db');
const { chatMessages } = require('../schema/schema');
const { desc, eq } = require('drizzle-orm');

const router = express.Router();

// Get chat messages for a specific stream
router.get('/:streamId', async (req, res) => {
  try {
    const { streamId } = req.params;
    const limit = parseInt(req.query.limit) || 50; // Default to last 50 messages

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.stream_id, streamId))
      .orderBy(desc(chatMessages.timestamp))
      .limit(limit);

    // Reverse to show oldest first
    const reversedMessages = messages.reverse().map(msg => ({
      id: msg.id,
      user: msg.username,
      message: msg.message,
      timestamp: msg.timestamp,
      isLiveComment: msg.is_live_comment
    }));

    res.json(reversedMessages);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ error: 'Failed to fetch chat messages' });
  }
});

module.exports = router;
