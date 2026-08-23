const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Get all projects with risk scores
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, r.total_score as risk_score, r.risk_level 
      FROM projects p
      LEFT JOIN risk_scores r ON p.project_id = r.project_id
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const [[totalStats]] = await pool.query(`
      SELECT 
        COUNT(*) as total_projects,
        SUM(sanctioned_amount) as total_sanctioned,
        SUM(actual_expenditure) as total_expenditure
      FROM projects
    `);
    
    const [[riskStats]] = await pool.query(`
      SELECT 
        SUM(CASE WHEN r.risk_level = 'CRITICAL' THEN 1 ELSE 0 END) as critical_risk,
        SUM(CASE WHEN r.risk_level = 'HIGH' THEN 1 ELSE 0 END) as high_risk,
        SUM(CASE WHEN r.risk_level = 'MEDIUM' THEN 1 ELSE 0 END) as medium_risk,
        SUM(CASE WHEN r.risk_level = 'LOW' THEN 1 ELSE 0 END) as low_risk
      FROM risk_scores r
    `);
    
    res.json({
      ...totalStats,
      ...riskStats,
      utilization: (totalStats.total_expenditure / totalStats.total_sanctioned) * 100
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get high-risk projects
router.get('/high-risk', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, r.total_score as risk_score, r.risk_level 
      FROM projects p
      JOIN risk_scores r ON p.project_id = r.project_id
      WHERE r.risk_level IN ('HIGH', 'CRITICAL')
      ORDER BY r.total_score DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const [[project]] = await pool.query(`
      SELECT p.*, r.total_score as risk_score, r.risk_level 
      FROM projects p
      LEFT JOIN risk_scores r ON p.project_id = r.project_id
      WHERE p.project_id = ?
    `, [req.params.id]);
    
    if (!project) return res.status(404).json({ error: 'Project not found' });
    
    const [anomalies] = await pool.query(`
      SELECT * FROM anomalies WHERE project_id = ?
    `, [req.params.id]);
    
    const [payments] = await pool.query(`
      SELECT * FROM payments WHERE project_id = ? ORDER BY payment_date DESC
    `, [req.params.id]);

    res.json({ ...project, anomalies, payments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new project
router.post('/', async (req, res) => {
  try {
    const { 
      project_name, 
      sector, 
      location, 
      sanctioned_amount, 
      expected_completion_date 
    } = req.body;

    const projectId = 'PROJ' + Math.floor(Math.random() * 100000);
    const amount = Number(sanctioned_amount) || 0;

    // Use schema fields: name, state, district, constituency, category, sanctioned_amount, estimated_cost, actual_expenditure, physical_progress, financial_progress, start_date, expected_completion, implementing_agency, status
    await pool.query(`
      INSERT INTO projects 
      (project_id, name, state, district, constituency, category, sanctioned_amount, estimated_cost, actual_expenditure, physical_progress, financial_progress, start_date, expected_completion, implementing_agency, status) 
      VALUES (?, ?, 'Uttarakhand', ?, 'Central', ?, ?, ?, 0, 0, 0, CURDATE(), ?, 'Local Agency', 'Pending')
    `, [projectId, project_name, location, sector, amount, amount, expected_completion_date]);

    // Initialize risk scores
    await pool.query(`
      INSERT INTO risk_scores (project_id, cost_overrun_score, delay_score, progress_mismatch_score, payment_anomaly_score, historical_deviation_score, duplicate_score, total_score, risk_level) 
      VALUES (?, 0, 0, 0, 0, 0, 0, 0, 'LOW')
    `, [projectId]);

    res.status(201).json({ message: 'Project created successfully', project_id: projectId });
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
