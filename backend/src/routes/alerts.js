/**
 * alerts.js — Alert Rules & Notification Endpoints
 * 
 * Routes:
 *   GET    /api/alerts             → List user's active alert rules
 *   POST   /api/alerts             → Create or update alert rule
 *   DELETE /api/alerts/:id         → Remove an alert rule
 *   GET    /api/notifications      → Get notification feed
 *   PATCH  /api/notifications/:id/read → Mark single notification read
 *   POST   /api/notifications/read-all → Mark all read
 */

import { Router } from 'express';
import {
  saveAlertRule,
  getUserAlertRules,
  deleteAlertRule,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsRead,
} from '../db/supabase.js';

const router = Router();

// GET /api/alerts?email=user@example.com
router.get('/', async (req, res) => {
  try {
    const email = req.query.email || req.headers['x-user-email'];
    if (!email) {
      return res.status(400).json({ error: 'User email is required' });
    }

    const rules = await getUserAlertRules(email);
    res.json(rules);
  } catch (err) {
    console.error('[alerts] Error fetching alert rules:', err.message);
    res.status(500).json({ error: 'Failed to fetch alert rules' });
  }
});

// POST /api/alerts
router.post('/', async (req, res) => {
  try {
    const { userEmail, productId, targetPrice, onPriceDrop, onBackInStock, userId } = req.body;

    if (!userEmail || !productId) {
      return res.status(400).json({ error: 'userEmail and productId are required' });
    }

    const rule = await saveAlertRule({
      userId: userId || null,
      userEmail,
      productId: Number(productId),
      targetPrice: targetPrice ? Number(targetPrice) : null,
      onPriceDrop: onPriceDrop !== undefined ? onPriceDrop : true,
      onBackInStock: onBackInStock !== undefined ? onBackInStock : true,
    });

    res.status(201).json({
      success: true,
      rule,
      message: `Alert configured for ${userEmail}`,
    });
  } catch (err) {
    console.error('[alerts] Error saving alert rule:', err.message);
    res.status(500).json({ error: 'Failed to save alert rule' });
  }
});

// DELETE /api/alerts/:id
router.delete('/:id', async (req, res) => {
  try {
    const email = req.query.email || req.headers['x-user-email'] || null;
    const ruleId = req.params.id;

    const deleted = await deleteAlertRule(ruleId, email);
    res.json({ success: deleted });
  } catch (err) {
    console.error('[alerts] Error deleting alert rule:', err.message);
    res.status(500).json({ error: 'Failed to delete alert rule' });
  }
});

// GET /api/notifications?email=user@example.com
router.get('/notifications', async (req, res) => {
  try {
    const email = req.query.email || req.headers['x-user-email'] || null;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));

    const notifications = await getUserNotifications(email, limit);
    res.json(notifications);
  } catch (err) {
    console.error('[alerts] Error fetching notifications:', err.message);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/notifications/:id/read', async (req, res) => {
  try {
    const email = req.query.email || req.headers['x-user-email'] || null;
    const updated = await markNotificationAsRead(req.params.id, email);
    res.json({ success: true, notification: updated });
  } catch (err) {
    console.error('[alerts] Error marking notification read:', err.message);
    res.status(500).json({ error: 'Failed to mark notification read' });
  }
});

// POST /api/notifications/read-all
router.post('/notifications/read-all', async (req, res) => {
  try {
    const email = req.body?.email || req.headers['x-user-email'] || null;
    const count = await markAllNotificationsRead(email);
    res.json({ success: true, count });
  } catch (err) {
    console.error('[alerts] Error marking all read:', err.message);
    res.status(500).json({ error: 'Failed to mark notifications read' });
  }
});

export default router;
