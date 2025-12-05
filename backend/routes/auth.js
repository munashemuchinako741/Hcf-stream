const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../server/db');
const { users } = require('../schema/schema');
const { eq } = require('drizzle-orm');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const redisClient = require('../config/redis');

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

const router = express.Router();

// Redis-based store for reset tokens (production-ready)

// Email transporter (configure with your email service)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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
    // block unverified / unapproved users
    if (!user[0].isApproved) {
      return res.status(403).json({
        error: 'Account not approved yet',
        message:
          'Your account has been created, but it has not been approved by an administrator yet.',
      });
    }
    const token = jwt.sign({ id: user[0].id, role: user[0].role }, process.env.JWT_SECRET);
    // Map username to name for frontend compatibility
    const userResponse = { ...user[0], name: user[0].username };
    res.json({ token, user: userResponse });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || user.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = uuidv4();
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    // Store reset token in Redis (production-ready)
    try {
      await redisClient.setEx(`reset_token:${resetToken}`, 3600, JSON.stringify({
        userId: user[0].id,
        email: user[0].email,
        expiry: resetTokenExpiry
      }));
    } catch (redisError) {
      console.error('Redis error storing reset token:', redisError);
      return res.status(500).json({ error: 'Failed to process reset request' });
    }

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Password Reset Request - HCF Stream',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You requested a password reset for your HCF Stream account.</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this reset, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This email was sent by HCF Stream. If you have any questions, please contact support.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to send reset email' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Verify token from Redis
    let tokenData;
    try {
      const tokenDataStr = await redisClient.get(`reset_token:${token}`);
      if (!tokenDataStr) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }
      tokenData = JSON.parse(tokenDataStr);
    } catch (redisError) {
      console.error('Redis error retrieving reset token:', redisError);
      return res.status(500).json({ error: 'Failed to verify reset token' });
    }

    // Check token expiry
    if (Date.now() > tokenData.expiry) {
      try {
        await redisClient.del(`reset_token:${token}`);
      } catch (redisError) {
        console.error('Redis error deleting expired token:', redisError);
      }
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, tokenData.userId));

    // Remove used token from Redis
    try {
      await redisClient.del(`reset_token:${token}`);
    } catch (redisError) {
      console.error('Redis error deleting used token:', redisError);
      // Don't fail the request if cleanup fails
    }

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Verify token endpoint
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      try {
        // Fetch user data from database
        const user = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);

        if (!user || user.length === 0) {
          return res.status(401).json({ error: 'User not found' });
        }

        // Return user data (without password) with name field for frontend compatibility
        const { password, ...userWithoutPassword } = user[0];
        const userResponse = { ...userWithoutPassword, name: user[0].username };
        res.json({ user: userResponse });
      } catch (dbError) {
        console.error('Database error during token verification:', dbError);
        res.status(500).json({ error: 'Database error' });
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);

    if (!user || user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user data (without password)
    const { password, ...userWithoutPassword } = user[0];
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required' });
    }

    // Check if email is already taken by another user
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser && existingUser.length > 0 && existingUser[0].id !== req.user.id) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const updateData = {
      username,
      email,
      updatedAt: new Date()
    };

    // If password is provided, hash and include it
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update user profile
    await db.update(users)
      .set(updateData)
      .where(eq(users.id, req.user.id));

    // Fetch updated user data
    const updatedUser = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    const { password: _, ...userWithoutPassword } = updatedUser[0];

    res.json({
      message: 'Profile updated successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
