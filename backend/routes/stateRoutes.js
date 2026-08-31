const express = require('express');
const router = express.Router();
const stateService = require('../services/stateService');

// Middleware to ensure state parameter is provided
const requireState = (req, res, next) => {
  const state = req.query.state;
  if (!state) {
    return res.status(400).json({ error: 'State parameter is required for State Nodal Authority APIs.' });
  }
  req.userState = state;
  next();
};

// Dashboard Overview
router.get('/dashboard', requireState, (req, res) => {
  try {
    const overview = stateService.getStateOverview(req.userState);
    res.json(overview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// District Rankings
router.get('/districts', requireState, (req, res) => {
  try {
    const rankings = stateService.getDistrictRankings(req.userState);
    res.json(rankings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Projects
router.get('/projects', requireState, (req, res) => {
  try {
    const projects = stateService.getProjectsForState(req.userState);
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Risk Distribution
router.get('/risk-distribution', requireState, (req, res) => {
  try {
    const distribution = stateService.getRiskDistribution(req.userState);
    res.json(distribution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Escalations
router.get('/escalations', requireState, (req, res) => {
  try {
    const escalations = stateService.getEscalations(req.userState);
    res.json(escalations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/escalations', requireState, (req, res) => {
  try {
    const newEscalation = stateService.createEscalation(req.body, req.userState);
    res.status(201).json(newEscalation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
