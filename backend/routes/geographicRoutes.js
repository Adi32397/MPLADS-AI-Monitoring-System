const express = require('express');
const router = express.Router();
const geographicService = require('../services/geographicService');

router.get('/overview', (req, res) => {
  try {
    const overview = geographicService.getGeographicOverview();
    res.json(overview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/state/:state', (req, res) => {
  try {
    const districtOverview = geographicService.getStateOverview(req.params.state);
    res.json(districtOverview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/all-districts', (req, res) => {
  try {
    const districts = geographicService.getAllDistrictsOverview();
    res.json(districts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/district/:district', (req, res) => {
  try {
    const projects = geographicService.getDistrictProjects(req.params.district);
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/risk-ranking', (req, res) => {
  try {
    const overview = geographicService.getGeographicOverview();
    res.json(overview); // Sorting is handled in service
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/category-risk', (req, res) => {
  try {
    const categoryRisk = geographicService.getCategoryRisk();
    res.json(categoryRisk);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/agency-risk', (req, res) => {
  try {
    const agencyRisk = geographicService.getAgencyRisk();
    res.json(agencyRisk);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/financial-risk', (req, res) => {
  try {
    // We can reuse the state/overview logic which contains financial aggregations
    const overview = geographicService.getGeographicOverview();
    const financialRisk = overview.map(o => ({
      Geography: o.State,
      Sanctioned_Amount: o.totalSanctioned,
      Actual_Expenditure: o.totalExpenditure,
      Cost_Overruns: o.costOverruns,
      Utilization: o.totalSanctioned > 0 ? ((o.totalExpenditure / o.totalSanctioned) * 100).toFixed(1) : 0
    }));
    res.json(financialRisk);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/delay-risk', (req, res) => {
  try {
    const overview = geographicService.getGeographicOverview();
    const delayRisk = overview.map(o => ({
      Geography: o.State,
      Delayed_Projects: o.delayedCount,
      Total_Projects: o.totalProjects
    }));
    res.json(delayRisk);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
