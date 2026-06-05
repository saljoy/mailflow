const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM campaigns ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM campaigns WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      name, subject, body_html, body_plain,
      contact_list, delay_seconds, start_time, end_time, schedule_type
    } = req.body;

    const contacts = await db.query(
      'SELECT COUNT(*) as count FROM contacts WHERE list_name = $1', [contact_list]
    );

    const result = await db.query(`
      INSERT INTO campaigns 
        (name, subject, body_html, body_plain, contact_list, delay_seconds, start_time, end_time, total_contacts, schedule_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      name, subject, body_html, body_plain,
      contact_list, delay_seconds || 30,
      start_time || '00:00', end_time || '23:59',
      contacts.rows[0].count, schedule_type || 'immediate'
    ]);

    res.json({ id: result.rows[0].id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/launch', async (req, res) => {
  try {
    const campaign = await db.query('SELECT * FROM campaigns WHERE id = $1', [req.params.id]);
    if (campaign.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });
    const c = campaign.rows[0];

    const contacts = await db.query(
      'SELECT email FROM contacts WHERE list_name = $1', [c.contact_list]
    );

    if (contacts.rows.length === 0) {
      return res.status(400).json({ error: 'No contacts found in this list' });
    }

    const accounts = await db.query("SELECT id FROM accounts WHERE status = 'active'");

    if (accounts.rows.length === 0) {
      return res.status(400).json({ error: 'No active Gmail accounts connected' });
    }

    await db.query("DELETE FROM queue WHERE campaign_id = $1 AND status = 'pending'", [c.id]);

    for (let i = 0; i < contacts.rows.length; i++) {
      const account = accounts.rows[i % accounts.rows.length];
      await db.query(
        `INSERT INTO queue (campaign_id, recipient_email, account_id, status) VALUES ($1, $2, $3, 'pending')`,
        [c.id, contacts.rows[i].email, account.id]
      );
    }

    await db.query(
      `UPDATE campaigns SET status = 'running', sent_count = 0, failed_count = 0 WHERE id = $1`,
      [c.id]
    );

    res.json({ success: true, queued: contacts.rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/pause', async (req, res) => {
  try {
    await db.query("UPDATE campaigns SET status = 'paused' WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/resume', async (req, res) => {
  try {
    await db.query("UPDATE campaigns SET status = 'running' WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM queue WHERE campaign_id = $1', [req.params.id]);
    await db.query('DELETE FROM campaigns WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;