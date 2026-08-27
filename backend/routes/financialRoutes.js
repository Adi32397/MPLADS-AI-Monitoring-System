const express = require('express');
const router = express.Router();
const analyticsService = require('../services/financialAnalytics');

router.get('/projects', (req, res) => {
  const { state, district } = req.query;
  const projects = analyticsService.getFilteredProjects(state, district);
  res.json(projects);
});

router.get('/projects/:id', (req, res) => {
  const project = analyticsService.getProjectById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found in CSV' });
  res.json(project);
});

router.get('/summary', (req, res) => {
  const { state, district } = req.query;
  const summary = analyticsService.getFinancialSummary(state, district);
  res.json(summary);
});

router.get('/alerts', (req, res) => {
  const { state, district } = req.query;
  const alerts = analyticsService.getFinancialAlerts(state, district);
  // Only return projects with some level of risk for the alerts table
  const highRiskAlerts = alerts.filter(p => p.risk.risk_level !== 'LOW');
  res.json(highRiskAlerts);
});

router.get('/analytics', (req, res) => {
  const { state, district } = req.query;
  const analytics = analyticsService.getFinancialAnalytics(state, district);
  res.json(analytics);
});

// Endpoint to force reload the CSV if it changes
router.post('/reload', async (req, res) => {
  try {
    await analyticsService.loadData();
    res.json({ success: true, message: 'CSV Data reloaded successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
