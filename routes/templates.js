const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all templates
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM templates ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get specific template
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM templates WHERE id = $1', [req.params.id]);
    const template = result.rows[0];
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create template
router.post('/', async (req, res) => {
  try {
    const { name, subject, body_html, body_plain } = req.body;
    const result = await db.query(
      `INSERT INTO templates (name, subject, body_html, body_plain) VALUES ($1, $2, $3, $4) RETURNING id`,
      [name, subject, body_html, body_plain]
    );
    res.json({ id: result.rows[0].id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update template
router.put('/:id', async (req, res) => {
  try {
    const { name, subject, body_html, body_plain } = req.body;
    await db.query(
      `UPDATE templates SET name = $1, subject = $2, body_html = $3, body_plain = $4 WHERE id = $5`,
      [name, subject, body_html, body_plain, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete template
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM templates WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
