const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const init = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT,
      access_token TEXT,
      refresh_token TEXT,
      token_expiry BIGINT,
      daily_sent INTEGER DEFAULT 0,
      daily_limit INTEGER DEFAULT 400,
      last_reset TEXT,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      list_name TEXT NOT NULL,
      email TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      company TEXT,
      website TEXT,
      custom1 TEXT,
      custom2 TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_html TEXT,
      body_plain TEXT,
      contact_list TEXT NOT NULL,
      delay_seconds INTEGER DEFAULT 30,
      start_time TEXT DEFAULT '00:00',
      end_time TEXT DEFAULT '23:59',
      schedule_type TEXT DEFAULT 'immediate',
      content_variations TEXT,
      content_mode TEXT DEFAULT 'random',
      status TEXT DEFAULT 'draft',
      total_contacts INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      open_count INTEGER DEFAULT 0,
      bounce_count INTEGER DEFAULT 0,
      unsubscribe_count INTEGER DEFAULT 0,
      reply_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS templates (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_html TEXT,
      body_plain TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS queue (
      id SERIAL PRIMARY KEY,
      campaign_id INTEGER NOT NULL REFERENCES campaigns(id),
      recipient_email TEXT NOT NULL,
      account_id INTEGER REFERENCES accounts(id),
      status TEXT DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      last_error TEXT,
      scheduled_at TIMESTAMP,
      sent_at TIMESTAMP,
      error TEXT,
      tracking_id TEXT UNIQUE
    );

    CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY,
      campaign_id INTEGER,
      account_id INTEGER,
      recipient_email TEXT,
      status TEXT,
      message TEXT,
      retry_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS blacklist (
      id SERIAL PRIMARY KEY,
      email TEXT,
      domain TEXT,
      reason TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS unsubscribes (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      campaign_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS opens (
      id SERIAL PRIMARY KEY,
      tracking_id TEXT NOT NULL,
      campaign_id INTEGER,
      recipient_email TEXT,
      opened_at TIMESTAMP DEFAULT NOW(),
      ip_address TEXT,
      user_agent TEXT
    );

    CREATE TABLE IF NOT EXISTS followup_sequences (
      id SERIAL PRIMARY KEY,
      campaign_id INTEGER NOT NULL REFERENCES campaigns(id),
      delay_days INTEGER NOT NULL DEFAULT 3,
      subject TEXT NOT NULL,
      body_html TEXT,
      body_plain TEXT,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS followup_queue (
      id SERIAL PRIMARY KEY,
      sequence_id INTEGER NOT NULL REFERENCES followup_sequences(id),
      campaign_id INTEGER NOT NULL,
      recipient_email TEXT NOT NULL,
      account_id INTEGER,
      scheduled_at TIMESTAMP NOT NULL,
      status TEXT DEFAULT 'pending',
      sent_at TIMESTAMP,
      error TEXT
    );
  `);

  // Add new columns to existing tables if they don't exist
  const migrations = [
    `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 400`,
    `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0`,
    `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS bounce_count INTEGER DEFAULT 0`,
    `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS unsubscribe_count INTEGER DEFAULT 0`,
    `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0`,
    `ALTER TABLE queue ADD COLUMN IF NOT EXISTS tracking_id TEXT`,
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_name TEXT`,
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_name TEXT`,
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company TEXT`,
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS website TEXT`,
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS custom1 TEXT`,
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS custom2 TEXT`,
  ];

  for (const sql of migrations) {
    try { await pool.query(sql); } catch (e) {}
  }

  console.log('Database tables ready');
};

init().catch(console.error);

module.exports = pool;