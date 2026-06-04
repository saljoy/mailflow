const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all campaigns
router.get('/', (req, res) => {
  try {
    const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all();
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single campaign
router.get('/:id', (req, res) => {
  try {
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new campaign
router.post('/', (req, res) => {
  try {
    const {
      name, subject, body_html, body_plain,
      contact_list, delay_seconds, start_time, end_time
    } = req.body;

    const contacts = db.prepare(
      'SELECT COUNT(*) as count FROM contacts WHERE list_name = ?'
    ).get(contact_list);

    const result = db.prepare(`
      INSERT INTO campaigns 
        (name, subject, body_html, body_plain, contact_list, delay_seconds, start_time, end_time, total_contacts)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, subject, body_html, body_plain,
      contact_list, delay_seconds || 30,
      start_time || '08:00', end_time || '22:00',
      contacts.count
    );

    res.json({ id: result.lastInsertRowid, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Launch a campaign — builds the queue
router.post('/:id/launch', (req, res) => {
  try {
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const contacts = db.prepare(
      'SELECT email FROM contacts WHERE list_name = ?'
    ).all(campaign.contact_list);

    if (contacts.length === 0) {
      return res.status(400).json({ error: 'No contacts found in this list' });
    }

    const accounts = db.prepare(
      "SELECT id FROM accounts WHERE status = 'active'"
    ).all();

    if (accounts.length === 0) {
      return res.status(400).json({ error: 'No active Gmail accounts connected' });
    }

    // Build queue with round-robin account assignment
    const insertQueue = db.prepare(`
      INSERT INTO queue (campaign_id, recipient_email, account_id, status)
      VALUES (?, ?, ?, 'pending')
    `);

    const insertMany = db.transaction(() => {
      contacts.forEach((contact, index) => {
        const account = accounts[index % accounts.length];
        insertQueue.run(campaign.id, contact.email, account.id);
      });
    });

    insertMany();

    db.prepare("UPDATE campaigns SET status = 'running' WHERE id = ?").run(campaign.id);

    res.json({ success: true, queued: contacts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pause a campaign
router.post('/:id/pause', (req, res) => {
  try {
    db.prepare("UPDATE campaigns SET status = 'paused' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Resume a campaign
router.post('/:id/resume', (req, res) => {
  try {
    db.prepare("UPDATE campaigns SET status = 'running' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a campaign
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM queue WHERE campaign_id = ?').run(req.params.id);
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
