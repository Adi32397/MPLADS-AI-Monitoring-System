const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Get all alerts
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.*, p.name as project_name, p.district 
      FROM alerts a
      JOIN projects p ON a.project_id = p.project_id
      ORDER BY a.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a verification request alert
router.post('/verification', async (req, res) => {
  const { project_id, reason, risk_score, recommended_action, assigned_authority, priority } = req.body;
  try {
    const [result] = await pool.query(`
      INSERT INTO alerts (project_id, alert_type, severity, message, assigned_to)
      VALUES (?, ?, ?, ?, ?)
    `, [project_id, 'Verification Request', priority, `Verification needed: ${reason}. Action: ${recommended_action}`, assigned_authority]);
    
    res.json({ success: true, message: 'Verification request created successfully.', alertId: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
