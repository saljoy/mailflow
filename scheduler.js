const cron = require('node-cron');
const db = require('./db');
const { google } = require('googleapis');
const crypto = require('crypto');

const BASE_URL = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : process.env.BACKEND_URL || 'https://mailflow-production-a2f9.up.railway.app';

async function getAuthForAccount(account) {
  const accountClient = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  accountClient.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.token_expiry
  });

  if (Date.now() > account.token_expiry) {
    const { credentials } = await accountClient.refreshAccessToken();
    await db.query(
      'UPDATE accounts SET access_token = $1, token_expiry = $2 WHERE id = $3',
      [credentials.access_token, credentials.expiry_date, account.id]
    );
    accountClient.setCredentials(credentials);
  }

  return accountClient;
}

// Replace personalization tags in content
function personalize(text, contact) {
  if (!text) return text;
  return text
    .replace(/{{first_name}}/gi, contact.first_name || '')
    .replace(/{{last_name}}/gi, contact.last_name || '')
    .replace(/{{email}}/gi, contact.email || '')
    .replace(/{{company}}/gi, contact.company || '')
    .replace(/{{website}}/gi, contact.website || '')
    .replace(/{{custom1}}/gi, contact.custom1 || '')
    .replace(/{{custom2}}/gi, contact.custom2 || '');
}

function makeEmail(to, fromName, fromEmail, subject, bodyHtml, bodyPlain, trackingId, campaignId) {
  const boundary = 'mailflow_boundary';
  const fromField = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

  // Add tracking pixel and unsubscribe link to HTML
  const trackingPixel = `<img src="${BASE_URL}/api/tracking/open/${trackingId}" width="1" height="1" style="display:none;" />`;
  const unsubLink = `<p style="font-size:11px;color:#999;margin-top:24px;">
    Don't want to receive these emails? 
    <a href="${BASE_URL}/api/tracking/unsubscribe/${trackingId}" style="color:#999;">Unsubscribe here</a>
  </p>`;

  const finalHtml = (bodyHtml || '') + trackingPixel + unsubLink;
  const finalPlain = (bodyPlain || '') + `\n\nTo unsubscribe: ${BASE_URL}/api/tracking/unsubscribe/${trackingId}`;

  const message = [
    `To: ${to}`,
    `From: ${fromField}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    finalPlain,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    finalHtml,
    '',
    `--${boundary}--`
  ].join('\n');

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function pickContent(campaign) {
  if (campaign.content_variations) {
    try {
      const variations = JSON.parse(campaign.content_variations);
      if (variations && variations.length > 0) {
        const pick = variations[Math.floor(Math.random() * variations.length)];
        return { subject: pick.subject, body_html: pick.body_html, body_plain: pick.body_plain };
      }
    } catch (e) {}
  }
  return { subject: campaign.subject, body_html: campaign.body_html, body_plain: campaign.body_plain };
}

async function isBlacklisted(email) {
  const domain = email.split('@')[1];
  const result = await db.query(
    'SELECT id FROM blacklist WHERE email = $1 OR domain = $2',
    [email.toLowerCase(), domain?.toLowerCase()]
  );
  return result.rows.length > 0;
}

async function isUnsubscribed(email) {
  const result = await db.query(
    'SELECT id FROM unsubscribes WHERE email = $1',
    [email.toLowerCase()]
  );
  return result.rows.length > 0;
}

async function processSendQueue() {
  try {
    const runningCampaigns = await db.query("SELECT * FROM campaigns WHERE status = 'running'");
    if (runningCampaigns.rows.length === 0) return;

    for (const campaign of runningCampaigns.rows) {
      const queueResult = await db.query(`
        SELECT q.*, 
          a.email as account_email, 
          a.display_name as account_display_name,
          a.access_token, 
          a.refresh_token, 
          a.token_expiry, 
          a.id as acc_id,
          a.daily_sent,
          a.daily_limit,
          c.first_name,
          c.last_name,
          c.company,
          c.website,
          c.custom1,
          c.custom2
        FROM queue q
        JOIN accounts a ON q.account_id = a.id
        LEFT JOIN contacts c ON c.email = q.recipient_email AND c.list_name = $2
        WHERE q.campaign_id = $1 
          AND q.status = 'pending' 
          AND a.status = 'active'
          AND a.daily_sent < a.daily_limit
        ORDER BY q.id ASC
        LIMIT 1
      `, [campaign.id, campaign.contact_list]);

      const queueItem = queueResult.rows[0];

      if (!queueItem) {
        const remaining = await db.query(
          "SELECT COUNT(*) as count FROM queue WHERE campaign_id = $1 AND status = 'pending'",
          [campaign.id]
        );

        if (parseInt(remaining.rows[0].count) === 0) {
          await db.query("UPDATE campaigns SET status = 'completed' WHERE id = $1", [campaign.id]);
          console.log(`Campaign "${campaign.name}" completed!`);
        } else {
          console.log(`Campaign "${campaign.name}" — daily limits reached, waiting for reset`);
        }
        continue;
      }

      // Check blacklist and unsubscribes
      if (await isBlacklisted(queueItem.recipient_email)) {
        await db.query("UPDATE queue SET status = 'skipped', error = 'Blacklisted' WHERE id = $1", [queueItem.id]);
        console.log(`Skipped blacklisted: ${queueItem.recipient_email}`);
        continue;
      }

      if (await isUnsubscribed(queueItem.recipient_email)) {
        await db.query("UPDATE queue SET status = 'skipped', error = 'Unsubscribed' WHERE id = $1", [queueItem.id]);
        console.log(`Skipped unsubscribed: ${queueItem.recipient_email}`);
        continue;
      }

      try {
        const content = pickContent(campaign);

        // Generate tracking ID
        const trackingId = crypto.randomUUID();
        await db.query('UPDATE queue SET tracking_id = $1 WHERE id = $2', [trackingId, queueItem.id]);

        // Build contact object for personalization
        const contact = {
          email: queueItem.recipient_email,
          first_name: queueItem.first_name || '',
          last_name: queueItem.last_name || '',
          company: queueItem.company || '',
          website: queueItem.website || '',
          custom1: queueItem.custom1 || '',
          custom2: queueItem.custom2 || '',
        };

        // Personalize content
        const subject = personalize(content.subject, contact);
        const bodyHtml = personalize(content.body_html, contact);
        const bodyPlain = personalize(content.body_plain, contact);

        console.log(`Sending to ${queueItem.recipient_email} via ${queueItem.account_email}...`);

        const auth = await getAuthForAccount({
          id: queueItem.acc_id,
          access_token: queueItem.access_token,
          refresh_token: queueItem.refresh_token,
          token_expiry: queueItem.token_expiry
        });

        const gmail = google.gmail({ version: 'v1', auth });

        const raw = makeEmail(
          queueItem.recipient_email,
          queueItem.account_display_name,
          queueItem.account_email,
          subject,
          bodyHtml,
          bodyPlain,
          trackingId,
          campaign.id
        );

        await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });

        await db.query("UPDATE queue SET status = 'sent', sent_at = NOW() WHERE id = $1", [queueItem.id]);
        await db.query("UPDATE campaigns SET sent_count = sent_count + 1 WHERE id = $1", [campaign.id]);
        await db.query("UPDATE accounts SET daily_sent = daily_sent + 1 WHERE id = $1", [queueItem.acc_id]);
        await db.query(
          `INSERT INTO logs (campaign_id, account_id, recipient_email, status, message) VALUES ($1, $2, $3, 'sent', 'Email sent successfully')`,
          [campaign.id, queueItem.acc_id, queueItem.recipient_email]
        );

        console.log(`Successfully sent to ${queueItem.recipient_email}`);

      } catch (err) {
        console.error(`Failed to send to ${queueItem.recipient_email}:`, err.message);

        // Detect bounce
        const isBounce = err.message.includes('invalid') || err.message.includes('not found') || err.message.includes('does not exist');

        await db.query(
          "UPDATE queue SET status = 'failed', error = $1 WHERE id = $2",
          [err.message, queueItem.id]
        );
        await db.query(
          `UPDATE campaigns SET failed_count = failed_count + 1${isBounce ? ', bounce_count = bounce_count + 1' : ''} WHERE id = $1`,
          [campaign.id]
        );
        await db.query(
          `INSERT INTO logs (campaign_id, account_id, recipient_email, status, message) VALUES ($1, $2, $3, $4, $5)`,
          [campaign.id, queueItem.acc_id, queueItem.recipient_email, isBounce ? 'bounced' : 'failed', err.message]
        );
      }
    }
  } catch (err) {
    console.error('Scheduler error:', err.message);
  }
}

// Process follow-up sequences
async function processFollowUps() {
  try {
    const due = await db.query(`
      SELECT fq.*, fs.subject, fs.body_html, fs.body_plain, fs.campaign_id as parent_campaign_id,
        a.email as account_email, a.display_name as account_display_name,
        a.access_token, a.refresh_token, a.token_expiry, a.id as acc_id,
        a.daily_sent, a.daily_limit
      FROM followup_queue fq
      JOIN followup_sequences fs ON fq.sequence_id = fs.id
      JOIN accounts a ON fq.account_id = a.id
      WHERE fq.status = 'pending'
        AND fq.scheduled_at <= NOW()
        AND a.status = 'active'
        AND a.daily_sent < a.daily_limit
      LIMIT 10
    `);

    for (const item of due.rows) {
      // Skip if unsubscribed or blacklisted
      if (await isUnsubscribed(item.recipient_email)) {
        await db.query("UPDATE followup_queue SET status = 'skipped' WHERE id = $1", [item.id]);
        continue;
      }
      if (await isBlacklisted(item.recipient_email)) {
        await db.query("UPDATE followup_queue SET status = 'skipped' WHERE id = $1", [item.id]);
        continue;
      }

      // Skip if recipient already replied (check logs)
      const replied = await db.query(
        "SELECT id FROM logs WHERE recipient_email = $1 AND status = 'replied'",
        [item.recipient_email]
      );
      if (replied.rows.length > 0) {
        await db.query("UPDATE followup_queue SET status = 'skipped' WHERE id = $1", [item.id]);
        continue;
      }

      try {
        const trackingId = crypto.randomUUID();
        const contact = { email: item.recipient_email };

        const auth = await getAuthForAccount({
          id: item.acc_id,
          access_token: item.access_token,
          refresh_token: item.refresh_token,
          token_expiry: item.token_expiry
        });

        const gmail = google.gmail({ version: 'v1', auth });
        const raw = makeEmail(
          item.recipient_email,
          item.account_display_name,
          item.account_email,
          personalize(item.subject, contact),
          personalize(item.body_html, contact),
          personalize(item.body_plain, contact),
          trackingId,
          item.campaign_id
        );

        await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
        await db.query("UPDATE followup_queue SET status = 'sent', sent_at = NOW() WHERE id = $1", [item.id]);
        await db.query("UPDATE accounts SET daily_sent = daily_sent + 1 WHERE id = $1", [item.acc_id]);
        console.log(`Follow-up sent to ${item.recipient_email}`);
      } catch (err) {
        await db.query("UPDATE followup_queue SET status = 'failed', error = $1 WHERE id = $2", [err.message, item.id]);
      }
    }
  } catch (err) {
    console.error('Follow-up scheduler error:', err.message);
  }
}

// Check for replies via Gmail API
async function checkReplies() {
  try {
    const accounts = await db.query("SELECT * FROM accounts WHERE status = 'active'");
    for (const account of accounts.rows) {
      try {
        const auth = await getAuthForAccount(account);
        const gmail = google.gmail({ version: 'v1', auth });

        // Get messages from last 24 hours
        const since = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
        const res = await gmail.users.messages.list({
          userId: 'me',
          q: `in:inbox after:${since}`,
          maxResults: 50
        });

        if (!res.data.messages) continue;

        for (const msg of res.data.messages) {
          const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'metadata', metadataHeaders: ['From', 'Subject'] });
          const fromHeader = detail.data.payload.headers.find(h => h.name === 'From');
          if (!fromHeader) continue;

          const fromEmail = fromHeader.value.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0]?.toLowerCase();
          if (!fromEmail) continue;

          // Check if this is a reply from someone we emailed
          const sentToThem = await db.query(
            "SELECT campaign_id FROM queue WHERE recipient_email = $1 AND status = 'sent' LIMIT 1",
            [fromEmail]
          );

          if (sentToThem.rows.length > 0) {
            const existing = await db.query(
              "SELECT id FROM logs WHERE recipient_email = $1 AND status = 'replied'",
              [fromEmail]
            );

            if (existing.rows.length === 0) {
              await db.query(
                `INSERT INTO logs (campaign_id, account_id, recipient_email, status, message) VALUES ($1, $2, $3, 'replied', 'Recipient replied to email')`,
                [sentToThem.rows[0].campaign_id, account.id, fromEmail]
              );
              await db.query(
                "UPDATE campaigns SET reply_count = reply_count + 1 WHERE id = $1",
                [sentToThem.rows[0].campaign_id]
              );
              console.log(`Reply detected from ${fromEmail}`);
            }
          }
        }
      } catch (e) {
        // Silent fail per account
      }
    }
  } catch (err) {
    console.error('Reply check error:', err.message);
  }
}

// Reset daily counts at midnight
cron.schedule('0 0 * * *', async () => {
  await db.query("UPDATE accounts SET daily_sent = 0, last_reset = NOW()");
  console.log('Daily sent counts reset');
});

// Main send queue — every 30 seconds
cron.schedule('*/30 * * * * *', async () => {
  console.log('Scheduler tick — checking queue...');
  await processSendQueue();
});

// Follow-up queue — every minute
cron.schedule('* * * * *', async () => {
  await processFollowUps();
});

// Reply detection — every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('Checking for replies...');
  await checkReplies();
});

console.log('Scheduler started — running every 30 seconds');