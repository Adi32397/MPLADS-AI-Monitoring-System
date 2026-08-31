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
const financialRoutes = require('./routes/financialRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const geographicRoutes = require('./routes/geographicRoutes');
const stateRoutes = require('./routes/stateRoutes');
const importRoutes = require('./routes/importRoutes');
const chatRoutes = require('./routes/chatRoutes');

app.use('/api/projects', projectsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/verification-queue', verificationRoutes);
app.use('/api/geographic', geographicRoutes);
app.use('/api/state', stateRoutes);
app.use('/api/import', importRoutes);
app.use('/api/chat', chatRoutes);
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
