const { pool } = require('./config/db');

async function updateRiskLevels() {
  try {
    const [result] = await pool.query(`
      UPDATE risk_scores r
      JOIN projects p ON r.project_id = p.project_id
      SET r.risk_level = CASE
        WHEN p.status = 'Cost Overrun' THEN 'HIGH'
        WHEN p.status = 'In Progress' THEN 'LOW'
        WHEN p.status = 'Delayed' THEN 'MEDIUM'
        WHEN p.status = 'Payment-Progress Mismatch' THEN 'HIGH'
        WHEN p.status = 'High Risk' THEN 'CRITICAL'
        WHEN p.status = 'Completed' THEN 'LOW'
        ELSE 'LOW'
      END
    `);
    
    await pool.query(`
      UPDATE risk_scores
      SET total_score = CASE
        WHEN risk_level = 'CRITICAL' THEN 95
        WHEN risk_level = 'HIGH' THEN 85
        WHEN risk_level = 'MEDIUM' THEN 50
        WHEN risk_level = 'LOW' THEN 20
        ELSE total_score
      END
    `);
    console.log(`Risk levels updated successfully based on project status. Affected rows: ${result.affectedRows}`);
  } catch (error) {
    console.error("Error updating risk levels:", error);
  } finally {
    process.exit();
  }
}

updateRiskLevels();
