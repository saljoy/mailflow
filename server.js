require('dotenv').config();
const express = require('express');
const cors = require('cors');
const requirePin = require('./middleware/auth');
const app = express();

app.use(cors());
app.use(express.json());

// Public routes — no PIN needed
app.get('/api/accounts', require('./routes/accounts').getAll);
app.get('/api/campaigns', require('./routes/campaigns').getAll);
app.get('/api/contacts/lists', require('./routes/contacts').getLists);
app.get('/api/queue', require('./routes/queue'));
app.get('/api/queue/stats', require('./routes/queue'));
app.get('/api/queue/logs', require('./routes/queue'));
app.get('/api/accounts/callback', require('./routes/accounts').callback);

// Protected routes — PIN required
app.use('/api/accounts', requirePin, require('./routes/accounts').router);
app.use('/api/campaigns', requirePin, require('./routes/campaigns').router);
app.use('/api/contacts', requirePin, require('./routes/contacts').router);

// Start scheduler
require('./scheduler');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MailFlow server running on port ${PORT}`);
});
