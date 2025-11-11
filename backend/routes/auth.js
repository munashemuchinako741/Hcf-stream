const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../server/db');
const { users } = require('../schema/schema');
const { eq } = require('drizzle-orm');
const { validateRegistration, validateLogin } = require('../middleware/validation');

const router = express.Router();

// Register
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser && existingUser.length > 0) {
      return res.status(409).json({ error: 'User already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    // Insert user into database
    const user = await db.insert(users).values({ email, password: hashedPassword, username: name }).returning();
    res.status(201).json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || user.length === 0) {
      return res.status(401).json({ error: 'User not registered' });
    }
    if (!await bcrypt.compare(password, user[0].password)) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    // 🚫 block unverified / unapproved users
    if (!user[0].isApproved) {
      return res.status(403).json({
        error: 'Account not approved yet',
        message:
          'Your account has been created, but it has not been approved by an administrator yet.',
      });
    }
    const token = jwt.sign({ id: user[0].id }, process.env.JWT_SECRET);
    res.json({ token, user: user[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
