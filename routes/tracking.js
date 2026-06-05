const express = require('express');
const router = express.Router();
const db = require('../db');

// 1x1 transparent pixel
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// Open tracking pixel
router.get('/open/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;

    // Find queue item
    const queueItem = await db.query(
      'SELECT campaign_id, recipient_email FROM queue WHERE tracking_id = $1',
      [trackingId]
    );

    if (queueItem.rows.length > 0) {
      const { campaign_id, recipient_email } = queueItem.rows[0];

      // Record open (only count unique opens)
      const existing = await db.query(
        'SELECT id FROM opens WHERE tracking_id = $1',
        [trackingId]
      );

      if (existing.rows.length === 0) {
        await db.query(
          'INSERT INTO opens (tracking_id, campaign_id, recipient_email, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)',
          [trackingId, campaign_id, recipient_email, req.ip, req.headers['user-agent']]
        );
        await db.query(
          'UPDATE campaigns SET open_count = open_count + 1 WHERE id = $1',
          [campaign_id]
        );
        await db.query(
          `INSERT INTO logs (campaign_id, recipient_email, status, message) VALUES ($1, $2, 'opened', 'Email opened')`,
          [campaign_id, recipient_email]
        );
      }
    }
  } catch (err) {
    console.error('Open tracking error:', err.message);
  }

  // Always return the pixel
  res.set('Content-Type', 'image/gif');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send(PIXEL);
});

// Unsubscribe handler
router.get('/unsubscribe/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;

    const queueItem = await db.query(
      'SELECT campaign_id, recipient_email FROM queue WHERE tracking_id = $1',
      [trackingId]
    );

    if (queueItem.rows.length > 0) {
      const { campaign_id, recipient_email } = queueItem.rows[0];

      // Add to unsubscribes
      await db.query(
        'INSERT INTO unsubscribes (email, campaign_id) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING',
        [recipient_email.toLowerCase(), campaign_id]
      );

      await db.query(
        'UPDATE campaigns SET unsubscribe_count = unsubscribe_count + 1 WHERE id = $1',
        [campaign_id]
      );

      await db.query(
        `INSERT INTO logs (campaign_id, recipient_email, status, message) VALUES ($1, $2, 'unsubscribed', 'Recipient unsubscribed')`,
        [campaign_id, recipient_email]
      );

      res.send(`
        <html>
          <body style="font-family:sans-serif;text-align:center;padding:60px;background:#f5f5f0;">
            <div style="max-width:400px;margin:0 auto;background:#fff;padding:40px;border-radius:16px;border:0.5px solid #e0e0d8;">
              <h2 style="color:#111;margin-bottom:8px;">You've been unsubscribed</h2>
              <p style="color:#666;font-size:14px;">${recipient_email} has been removed from this mailing list. You won't receive any more emails from this campaign.</p>
            </div>
          </body>
        </html>
      `);
    } else {
      res.send(`
        <html>
          <body style="font-family:sans-serif;text-align:center;padding:60px;">
            <h2>Already unsubscribed or link expired.</h2>
          </body>
        </html>
      `);
    }
  } catch (err) {
    console.error('Unsubscribe error:', err.message);
    res.status(500).send('Error processing unsubscribe request.');
  }
});

// Get unsubscribe list
router.get('/unsubscribes', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM unsubscribes ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete from unsubscribe list
router.delete('/unsubscribes/:email', async (req, res) => {
  try {
    await db.query('DELETE FROM unsubscribes WHERE email = $1', [req.params.email]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;