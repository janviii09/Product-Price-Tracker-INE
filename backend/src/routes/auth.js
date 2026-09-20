/**
 * auth.js — User Authentication Routes (Powered by Supabase Auth with Local Fallback)
 * 
 * Routes:
 *   POST /api/auth/signup   → Register with email & password
 *   POST /api/auth/login    → Sign in with email & password
 *   POST /api/auth/logout   → Sign out session
 *   GET  /api/auth/me       → Get current authenticated user
 */

import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';

const router = Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const db = getSupabase();
    if (db?.auth) {
      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: {
          data: { name: name || email.split('@')[0] },
        },
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(201).json({
        success: true,
        user: {
          id: data.user?.id,
          email: data.user?.email,
          name: data.user?.user_metadata?.name || email.split('@')[0],
        },
        session: data.session,
        message: 'Account created successfully',
      });
    }

    // Fallback if Supabase Auth not active
    const fallbackUser = {
      id: `usr_${Date.now()}`,
      email,
      name: name || email.split('@')[0],
    };
    return res.status(201).json({
      success: true,
      user: fallbackUser,
      session: { access_token: `token_${Date.now()}` },
      message: 'Account created successfully',
    });
  } catch (err) {
    console.error('[auth] Signup error:', err.message);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getSupabase();
    if (db?.auth) {
      const { data, error } = await db.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return res.status(401).json({ error: error.message });
      }

      return res.json({
        success: true,
        user: {
          id: data.user?.id,
          email: data.user?.email,
          name: data.user?.user_metadata?.name || email.split('@')[0],
        },
        session: data.session,
      });
    }

    // Fallback if Supabase Auth not active
    return res.json({
      success: true,
      user: {
        id: `usr_${Date.now()}`,
        email,
        name: email.split('@')[0],
      },
      session: { access_token: `token_${Date.now()}` },
    });
  } catch (err) {
    console.error('[auth] Login error:', err.message);
    res.status(500).json({ error: 'Failed to sign in' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const db = getSupabase();
    if (db?.auth) {
      await db.auth.signOut().catch(() => {});
    }
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    console.error('[auth] Logout error:', err.message);
    res.status(500).json({ error: 'Failed to log out' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ user: null });
    }

    const token = authHeader.split(' ')[1];
    const db = getSupabase();

    if (db?.auth) {
      const { data: { user }, error } = await db.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ user: null });
      }

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email.split('@')[0],
        },
      });
    }

    res.status(401).json({ user: null });
  } catch (err) {
    res.status(401).json({ user: null });
  }
});

export default router;
