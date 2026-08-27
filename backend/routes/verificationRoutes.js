const express = require('express');
const router = express.Router();
const verificationService = require('../services/verificationService');

router.get('/', async (req, res) => {
  try {
    const { state, district } = req.query;
    const queue = await verificationService.getQueue(state, district);
    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:projectId', async (req, res) => {
  try {
    const details = await verificationService.getProjectDetails(req.params.projectId);
    if (!details) return res.status(404).json({ error: 'Project not found' });
    res.json(details);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:projectId/status', async (req, res) => {
  try {
    const { status } = req.body;
    await verificationService.updateStatus(req.params.projectId, status);
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:projectId/assign', async (req, res) => {
  try {
    await verificationService.assignOfficer(req.params.projectId, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:projectId/findings', async (req, res) => {
  try {
    const result = await verificationService.submitFindings(req.params.projectId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
