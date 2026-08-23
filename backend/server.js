const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initDb } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
const projectsRoutes = require('./routes/projects');
const analyticsRoutes = require('./routes/analytics');
const alertsRoutes = require('./routes/alerts');

app.use('/api/projects', projectsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/alerts', alertsRoutes);
// ML integration is mocked/forwarded if ML service is running

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Start Server
const startServer = async () => {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
