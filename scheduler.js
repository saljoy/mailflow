const cron = require('node-cron');
const db = require('./db');
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Refreshes a Gmail account token if expired
async function getAuthForAccount(account) {
  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.token_expiry
  });

  if (Date.now() > account.token_expiry) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    db.prepare(`
      UPDATE accounts 
      SET access_token = ?, token_expiry = ? 
      WHERE id = ?
    `).run(credentials.access_token, credentials.expiry_date, account.id);
    oauth2Client.setCredentials(credentials);
  }

  return oauth2Client;
}

// Converts email content to base64 format Gmail API needs
function makeEmail(to, subject, bodyHtml, bodyPlain) {
  const boundary = 'mailflow_boundary';
  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    bodyPlain || '',
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    bodyHtml || '',
    '',
    `--${boundary}--`
  ].join('\n');

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Checks if current time is within campaign sending window
function isWithinSendingWindow(startTime, endTime) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const current = currentHour * 60 + currentMin;

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;

  return current >= start && current <= end;
}

// Sends one email from the queue
async function sendNextEmail() {
  const runningCampaigns = db.prepare(`
    SELECT * FROM campaigns WHERE status = 'running'
  `).all();

  if (runningCampaigns.length === 0) return;

  for (const campaign of runningCampaigns) {
    if (!isWithinSendingWindow(campaign.start_time, campaign.end_time)) continue;

    // Get next pending email in queue for this campaign
    const queueItem = db.prepare(`
      SELECT q.*, a.email as account_email, a.access_token, a.refresh_token, a.token_expiry
      FROM queue q
      JOIN accounts a ON q.account_id = a.id
      WHERE q.campaign_id = ? AND q.status = 'pending'
      ORDER BY q.id ASC
      LIMIT 1
    `).get(campaign.id);

    if (!queueItem) {
      // No more pending — mark campaign complete
      db.prepare("UPDATE campaigns SET status = 'completed' WHERE id = ?").run(campaign.id);
      continue;
    }

    try {
      const auth = await getAuthForAccount({
        id: queueItem.account_id,
        access_token: queueItem.access_token,
        refresh_token: queueItem.refresh_token,
        token_expiry: queueItem.token_expiry
      });

      const gmail = google.gmail({ version: 'v1', auth });

      const raw = makeEmail(
        queueItem.recipient_email,
        campaign.subject,
        campaign.body_html,
        campaign.body_plain
      );

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw }
      });

      // Mark as sent
      db.prepare(`
        UPDATE queue SET status = 'sent', sent_at = datetime('now') WHERE id = ?
      `).run(queueItem.id);

      // Update campaign sent count
      db.prepare(`
        UPDATE campaigns SET sent_count = sent_count + 1 WHERE id = ?
      `).run(campaign.id);

      // Update account daily sent count
      db.prepare(`
        UPDATE accounts SET daily_sent = daily_sent + 1 WHERE id = ?
      `).run(queueItem.account_id);

      // Log success
      db.prepare(`
        INSERT INTO logs (campaign_id, account_id, recipient_email, status, message)
        VALUES (?, ?, ?, 'sent', 'Email sent successfully')
      `).run(campaign.id, queueItem.account_id, queueItem.recipient_email);

    } catch (err) {
      // Mark as failed
      db.prepare(`
        UPDATE queue SET status = 'failed', error = ? WHERE id = ?
      `).run(err.message, queueItem.id);

      // Update campaign failed count
      db.prepare(`
        UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = ?
      `).run(campaign.id);

      // Log failure
      db.prepare(`
        INSERT INTO logs (campaign_id, account_id, recipient_email, status, message)
        VALUES (?, ?, ?, 'failed', ?)
      `).run(campaign.id, queueItem.account_id, queueItem.recipient_email, err.message);
    }
  }
}

// Resets daily sent counts for all accounts at midnight
cron.schedule('0 0 * * *', () => {
  db.prepare(`UPDATE accounts SET daily_sent = 0, last_reset = datetime('now')`).run();
  console.log('Daily sent counts reset');
});

// Main sending loop — runs every 10 seconds and checks delay per campaign
let lastSent = {};

cron.schedule('*/10 * * * * *', async () => {
  const runningCampaigns = db.prepare(`
    SELECT * FROM campaigns WHERE status = 'running'
  `).all();

  for (const campaign of runningCampaigns) {
    const now = Date.now();
    const last = lastSent[campaign.id] || 0;
    const delayMs = campaign.delay_seconds * 1000;

    if (now - last >= delayMs) {
      lastSent[campaign.id] = now;
      await sendNextEmail(campaign);
    }
  }
});

console.log('Scheduler started');
