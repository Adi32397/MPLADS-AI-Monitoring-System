const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// District level risk ranking
router.get('/districts/risk', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.district,
        COUNT(p.id) as total_projects,
        AVG(r.total_score) as average_risk_score,
        SUM(CASE WHEN r.risk_level IN ('HIGH', 'CRITICAL') THEN 1 ELSE 0 END) as high_risk_projects
      FROM projects p
      LEFT JOIN risk_scores r ON p.project_id = r.project_id
      GROUP BY p.district
      ORDER BY average_risk_score DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Category level stats
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        category,
        COUNT(id) as total_projects,
        SUM(sanctioned_amount) as total_sanctioned,
        SUM(actual_expenditure) as total_expenditure
      FROM projects
      GROUP BY category
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Duplicate works detection
router.get('/duplicates', async (req, res) => {
  try {
    // A simplified mock of duplicate detection logic using exact matches on category and district
    // In reality, this would use NLP / ML similarity from the ML service
    const [rows] = await pool.query(`
      SELECT 
        p1.project_id as work_a,
        p2.project_id as work_b,
        p1.name as name_a,
        p2.name as name_b,
        p1.district,
        p1.category,
        p1.sanctioned_amount as cost_a,
        p2.sanctioned_amount as cost_b,
        90 as similarity,
        'Requires Verification' as status
      FROM projects p1
      JOIN projects p2 ON p1.category = p2.category AND p1.district = p2.district AND p1.id < p2.id
      WHERE ABS(p1.sanctioned_amount - p2.sanctioned_amount) < 50000
      LIMIT 10
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
