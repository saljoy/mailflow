const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });

router.get('/lists', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT list_name, COUNT(*) as count, MAX(created_at) as created_at
      FROM contacts
      GROUP BY list_name
      ORDER BY MAX(created_at) DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/lists/:name', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM contacts WHERE list_name = $1 ORDER BY created_at DESC',
      [req.params.name]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/manual', async (req, res) => {
  try {
    const { list_name, emails } = req.body;

    if (!list_name || !emails || emails.length === 0) {
      return res.status(400).json({ error: 'List name and emails are required' });
    }

    for (const email of emails) {
      const clean = email.trim().toLowerCase();
      if (clean) {
        await db.query(
          'INSERT INTO contacts (list_name, email) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [list_name, clean]
        );
      }
    }

    res.json({ success: true, added: emails.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/upload', upload.single('file'), (req, res) => {
  try {
    const { list_name } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const emails = [];
    const filePath = req.file.path;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const email = row.email || row.Email || row.EMAIL;
        if (email && email.trim()) {
          emails.push(email.trim().toLowerCase());
        }
      })
      .on('end', async () => {
        for (const email of emails) {
          await db.query(
            'INSERT INTO contacts (list_name, email) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [list_name, email]
          );
        }
        fs.unlinkSync(filePath);
        res.json({ success: true, added: emails.length });
      })
      .on('error', (err) => {
        res.status(500).json({ error: err.message });
      });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/lists/:name', async (req, res) => {
  try {
    await db.query('DELETE FROM contacts WHERE list_name = $1', [req.params.name]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;