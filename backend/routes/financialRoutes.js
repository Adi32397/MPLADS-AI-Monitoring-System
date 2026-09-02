const express = require('express');
const router = express.Router();
const analyticsService = require('../services/financialAnalytics');

router.get('/projects', async (req, res) => {
  try {
    const { state, district } = req.query;
    const projects = await analyticsService.getFilteredProjects(state, district);
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/projects/:id', async (req, res) => {
  try {
    const project = await analyticsService.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const { state, district } = req.query;
    const summary = await analyticsService.getFinancialSummary(state, district);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/alerts', async (req, res) => {
  try {
    const { state, district } = req.query;
    const alerts = await analyticsService.getFinancialAlerts(state, district);
    const highRiskAlerts = alerts.filter(p => p.risk.risk_level !== 'LOW');
    res.json(highRiskAlerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    const { state, district } = req.query;
    const analytics = await analyticsService.getFinancialAnalytics(state, district);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to force reload the CSV if it changes (Deprecated/No-op since DB is live)
router.post('/reload', async (req, res) => {
  res.json({ success: true, message: 'Data is now live from MySQL, no reload needed.' });
});

module.exports = router;
