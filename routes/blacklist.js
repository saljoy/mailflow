const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all blacklist entries
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM blacklist ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add to blacklist
router.post('/', async (req, res) => {
  try {
    const { email, domain, reason } = req.body;
    if (!email && !domain) return res.status(400).json({ error: 'Email or domain required' });

    await db.query(
      'INSERT INTO blacklist (email, domain, reason) VALUES ($1, $2, $3)',
      [email?.toLowerCase() || null, domain?.toLowerCase() || null, reason || 'Manually added']
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove from blacklist
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM blacklist WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;