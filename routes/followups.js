const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all sequences for a campaign
router.get('/campaign/:campaignId', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM followup_sequences WHERE campaign_id = $1 ORDER BY delay_days ASC',
      [req.params.campaignId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a follow-up sequence
router.post('/', async (req, res) => {
  try {
    const { campaign_id, delay_days, subject, body_html, body_plain } = req.body;

    const result = await db.query(
      `INSERT INTO followup_sequences (campaign_id, delay_days, subject, body_html, body_plain) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [campaign_id, delay_days || 3, subject, body_html, body_plain]
    );

    // Schedule follow-up emails for all sent contacts in this campaign
    const sent = await db.query(
      "SELECT recipient_email, account_id FROM queue WHERE campaign_id = $1 AND status = 'sent'",
      [campaign_id]
    );

    for (const contact of sent.rows) {
      await db.query(
        `INSERT INTO followup_queue (sequence_id, campaign_id, recipient_email, account_id, scheduled_at)
         VALUES ($1, $2, $3, $4, NOW() + INTERVAL '${parseInt(delay_days) || 3} days')`,
        [result.rows[0].id, campaign_id, contact.recipient_email, contact.account_id]
      );
    }

    res.json({ id: result.rows[0].id, success: true, scheduled: sent.rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a sequence
router.delete('/:id', async (req, res) => {
  try {
    await db.query("DELETE FROM followup_queue WHERE sequence_id = $1 AND status = 'pending'", [req.params.id]);
    await db.query('DELETE FROM followup_sequences WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get follow-up stats
router.get('/stats/:campaignId', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        fs.id, fs.delay_days, fs.subject,
        COUNT(fq.id) as total,
        COUNT(CASE WHEN fq.status = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN fq.status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN fq.status = 'failed' THEN 1 END) as failed
      FROM followup_sequences fs
      LEFT JOIN followup_queue fq ON fq.sequence_id = fs.id
      WHERE fs.campaign_id = $1
      GROUP BY fs.id
      ORDER BY fs.delay_days ASC
    `, [req.params.campaignId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;