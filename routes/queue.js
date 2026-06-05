const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        q.id, q.recipient_email, q.status, q.sent_at, q.error,
        a.email as account_email,
        c.name as campaign_name
      FROM queue q
      LEFT JOIN accounts a ON q.account_id = a.id
      LEFT JOIN campaigns c ON q.campaign_id = c.id
      ORDER BY q.id DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const total = await db.query('SELECT COUNT(*) as count FROM queue');
    const pending = await db.query("SELECT COUNT(*) as count FROM queue WHERE status = 'pending'");
    const sent = await db.query("SELECT COUNT(*) as count FROM queue WHERE status = 'sent'");
    const failed = await db.query("SELECT COUNT(*) as count FROM queue WHERE status = 'failed'");
    const campaigns = await db.query("SELECT COUNT(*) as count FROM campaigns WHERE status = 'running'");
    const accounts = await db.query("SELECT COUNT(*) as count FROM accounts WHERE status = 'active'");
    const todaySent = await db.query(`
      SELECT COUNT(*) as count FROM queue 
      WHERE status = 'sent' AND DATE(sent_at) = CURRENT_DATE
    `);

    res.json({
      total: total.rows[0].count,
      pending: pending.rows[0].count,
      sent: sent.rows[0].count,
      failed: failed.rows[0].count,
      today_sent: todaySent.rows[0].count,
      active_campaigns: campaigns.rows[0].count,
      active_accounts: accounts.rows[0].count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        l.*,
        a.email as account_email,
        c.name as campaign_name
      FROM logs l
      LEFT JOIN accounts a ON l.account_id = a.id
      LEFT JOIN campaigns c ON l.campaign_id = c.id
      ORDER BY l.created_at DESC
      LIMIT 200
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;