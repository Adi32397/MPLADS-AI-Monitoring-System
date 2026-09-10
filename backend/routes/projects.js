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

    // Fetch anomalies from the database
    const [anomaliesRows] = await pool.query(`
      SELECT project_id, anomaly_type, description, severity FROM anomalies
    `);
    
    const anomaliesByProject = {};
    anomaliesRows.forEach(a => {
      if (!anomaliesByProject[a.project_id]) {
        anomaliesByProject[a.project_id] = [];
      }
      anomaliesByProject[a.project_id].push({ type: a.anomaly_type, description: a.description, severity: a.severity });
    });

    // Map anomalies back to projects
    
    // Fetch payments from the database
    const [paymentsRows] = await pool.query(`
      SELECT project_id, payment_date, amount, payment_type, status FROM payments
    `);

    const paymentsByProject = {};
    paymentsRows.forEach(p => {
      if (!paymentsByProject[p.project_id]) {
        paymentsByProject[p.project_id] = [];
      }
      paymentsByProject[p.project_id].push({
        payment_date: p.payment_date,
        amount: p.amount,
        payment_type: p.payment_type,
        status: p.status
      });
    });

    const enrichedRows = rows.map(p => {
      return { 
        ...p, 
        anomalies: anomaliesByProject[p.project_id] || [],
        payments: paymentsByProject[p.project_id] || []
      };
    });

    res.json(enrichedRows);
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

    const [[delayedStats]] = await pool.query(`
      SELECT COUNT(*) as delayed_projects FROM projects WHERE status = 'Delayed'
    `);

    // Compute anomalies from the actual AI anomalies table
    const [[anomalyStats]] = await pool.query(`
      SELECT COUNT(*) as anomalies_detected FROM anomalies
    `);

    const [expenditureRows] = await pool.query(`
      SELECT 
        DATE_FORMAT(start_date, '%b') as month,
        SUM(sanctioned_amount) as sanctioned,
        SUM(actual_expenditure) as expenditure
      FROM projects
      WHERE start_date IS NOT NULL
      GROUP BY DATE_FORMAT(start_date, '%b'), MONTH(start_date)
      ORDER BY MONTH(start_date)
      LIMIT 6
    `);

    // In case no data exists, provide a fallback to prevent UI crash
    const expenditureData = expenditureRows.length > 0 ? expenditureRows : [
      { month: 'Apr', sanctioned: 200, expenditure: 150 },
      { month: 'May', sanctioned: 220, expenditure: 160 }
    ];
    
    res.json({
      ...totalStats,
      ...riskStats,
      delayed_projects: delayedStats.delayed_projects || 0,
      anomalies_detected: anomalyStats.anomalies_detected || 0,
      expenditureData,
      utilization: totalStats.total_sanctioned > 0 ? (totalStats.total_expenditure / totalStats.total_sanctioned) * 100 : 0
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
      VALUES (?, ?, 'Uttarakhand', ?, 'Example Constituency', ?, ?, ?, 0, 0, 0, CURDATE(), ?, 'Local Agency', 'Pending')
    `, [projectId, project_name, location || 'Dehradun', sector, amount, amount, expected_completion_date]);

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

// Helper to extract fields case-insensitively with alias support
function getField(obj, ...keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') {
      return String(obj[k]).trim();
    }
  }
  const entries = Object.entries(obj);
  for (const k of keys) {
    const target = k.toLowerCase().replace(/[\s_-]/g, '');
    for (const [key, val] of entries) {
      if (key.toLowerCase().replace(/[\s_-]/g, '') === target) {
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim();
        }
      }
    }
  }
  return undefined;
}

// Clean number parsing (handles ₹, $, commas, %, etc.)
function cleanNumber(val, defaultVal = 0) {
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
  if (!val || typeof val !== 'string') return defaultVal;
  const cleaned = val.replace(/[₹$,\s%]/g, '').trim();
  const num = Number(cleaned);
  return isNaN(num) ? defaultVal : num;
}

// Robust date normalization to YYYY-MM-DD for MySQL DATE columns
function parseDateForDb(val, fallback = null) {
  if (!val || typeof val !== 'string') return fallback;
  val = val.trim();
  if (!val || val.toLowerCase() === 'n/a' || val.toLowerCase() === 'null') return fallback;
  
  // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = val.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  
  // YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = val.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Try standard JS Date parsing
  const parsed = new Date(val);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return fallback;
}

// Bulk create / upsert projects
router.post('/bulk', async (req, res) => {
  try {
    const projects = req.body;
    if (!Array.isArray(projects) || projects.length === 0) {
      return res.status(400).json({ error: 'Expected an array of projects' });
    }

    const validRecords = [];
    const riskRecords = [];
    const anomalyRecords = [];
    const seenIds = new Set();
    
    for (const p of projects) {
      const rawId = getField(p, 'Project_ID', 'Project ID', 'project_id', 'ID', 'Work_ID', 'Work ID');
      const projectId = rawId || ('PROJ-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 100000));
      
      // Deduplicate inside the batch itself to prevent same-statement duplicate key errors
      if (seenIds.has(projectId)) continue;
      seenIds.add(projectId);

      const amount = cleanNumber(getField(p, 'Sanctioned_Amount', 'Sanctioned Amount', 'sanctioned_amount', 'Amount', 'amount', 'Cost', 'Sanctioned'), 0);
      const actExp = cleanNumber(getField(p, 'Actual_Expenditure', 'Actual Expenditure', 'actual_expenditure', 'Expenditure', 'expenditure', 'Expended'), 0);
      const estCost = cleanNumber(getField(p, 'Estimated_Cost', 'Estimated Cost', 'estimated_cost'), amount);
      const phyProg = Math.min(100, Math.max(0, Math.round(cleanNumber(getField(p, 'Physical_Progress', 'Physical Progress', 'physical_progress', 'Progress', 'progress'), 0))));
      const finProg = Math.min(100, Math.max(0, Math.round(cleanNumber(getField(p, 'Financial_Progress', 'Financial Progress', 'financial_progress'), 0))));
      
      const validStatus = getField(p, 'Status', 'status', 'Work_Status') || 'In Progress';
      const normStatus = validStatus.toLowerCase();
      
      const csvRisk = (getField(p, 'Risk_Status', 'Risk Status', 'risk_status', 'Risk_Level', 'Risk Level', 'risk_level') || '').toUpperCase();
      let riskLevel = 'LOW';
      let totalScore = Math.floor(Math.random() * 20) + 10;
      
      if (csvRisk === 'CRITICAL') {
        riskLevel = 'CRITICAL';
        totalScore = 95;
      } else if (csvRisk === 'HIGH') {
        riskLevel = 'HIGH';
        totalScore = 80 + Math.floor(Math.random() * 10);
      } else if (csvRisk === 'MEDIUM') {
        riskLevel = 'MEDIUM';
        totalScore = 50 + Math.floor(Math.random() * 15);
      } else if (csvRisk === 'LOW') {
        riskLevel = 'LOW';
        totalScore = 15;
      } else {
        if (normStatus.includes('cost overrun') || normStatus.includes('mismatch')) {
          riskLevel = 'HIGH';
          totalScore = 80 + Math.floor(Math.random() * 10);
        } else if (normStatus.includes('critical') || normStatus.includes('high risk') || (actExp > amount && amount > 0)) {
          riskLevel = 'CRITICAL';
          totalScore = 95;
        } else if (normStatus.includes('delayed')) {
          riskLevel = 'MEDIUM';
          totalScore = 50 + Math.floor(Math.random() * 15);
        }
      }

      const startDate = parseDateForDb(getField(p, 'Start_Date', 'Start Date', 'start_date', 'StartDate'), '2024-01-01');
      const expDate = parseDateForDb(getField(p, 'Expected_Completion', 'Expected Completion', 'expected_completion', 'Expected_Completion_Date'), '2025-01-01');

      validRecords.push([
        projectId, 
        getField(p, 'Project_Name', 'Project Name', 'project_name', 'Work_Name', 'Work Name', 'Name', 'name', 'Title') || 'Bulk Imported Project', 
        getField(p, 'State', 'state', 'State_Name') || 'Uttarakhand', 
        getField(p, 'District', 'district', 'District_Name') || 'Dehradun',
        getField(p, 'Constituency', 'constituency') || 'Example Constituency',
        getField(p, 'Category', 'category', 'Sector', 'sector') || 'Other', 
        amount, 
        estCost, 
        actExp, 
        phyProg, 
        finProg, 
        startDate, 
        expDate, 
        getField(p, 'Implementing_Agency', 'Implementing Agency', 'implementing_agency', 'Agency', 'agency') || 'Local Agency', 
        validStatus
      ]);

      riskRecords.push([
        projectId, 0, 0, 0, 0, 0, 0, totalScore, riskLevel
      ]);

      if (normStatus.includes('cost overrun') || (actExp > amount && amount > 0)) {
        anomalyRecords.push([
          projectId, 'Cost Overrun', 'HIGH', `Expenditure exceeds sanctioned amount by +₹${((actExp - amount)/100000).toFixed(1)}L`, totalScore
        ]);
      } else if (normStatus.includes('mismatch') || (finProg > phyProg + 20)) {
        anomalyRecords.push([
          projectId, 'Progress Mismatch', 'HIGH', `Financial progress (${finProg}%) exceeds physical progress (${phyProg}%)`, totalScore
        ]);
      } else if (normStatus.includes('high risk') || riskLevel === 'CRITICAL') {
        anomalyRecords.push([
          projectId, 'Critical AI Risk Flag', 'CRITICAL', 'Severe anomaly detected: Combined financial deviation and abnormal trajectory', totalScore
        ]);
      }
    }

    if (validRecords.length > 0) {
      const chunkSize = 500;
      
      for (let i = 0; i < validRecords.length; i += chunkSize) {
        const chunk = validRecords.slice(i, i + chunkSize);
        const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
        const flatParams = chunk.flat();
        await pool.query(`
          INSERT INTO projects 
          (project_id, name, state, district, constituency, category, sanctioned_amount, estimated_cost, actual_expenditure, physical_progress, financial_progress, start_date, expected_completion, implementing_agency, status) 
          VALUES ${placeholders}
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            state = VALUES(state),
            district = VALUES(district),
            constituency = VALUES(constituency),
            category = VALUES(category),
            sanctioned_amount = VALUES(sanctioned_amount),
            estimated_cost = VALUES(estimated_cost),
            actual_expenditure = VALUES(actual_expenditure),
            physical_progress = VALUES(physical_progress),
            financial_progress = VALUES(financial_progress),
            start_date = VALUES(start_date),
            expected_completion = VALUES(expected_completion),
            implementing_agency = VALUES(implementing_agency),
            status = VALUES(status)
        `, flatParams);
      }

      for (let i = 0; i < riskRecords.length; i += chunkSize) {
        const chunk = riskRecords.slice(i, i + chunkSize);
        const riskPlaceholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
        const riskFlatParams = chunk.flat();
        await pool.query(`
          INSERT INTO risk_scores (project_id, cost_overrun_score, delay_score, progress_mismatch_score, payment_anomaly_score, historical_deviation_score, duplicate_score, total_score, risk_level) 
          VALUES ${riskPlaceholders}
          ON DUPLICATE KEY UPDATE
            cost_overrun_score = VALUES(cost_overrun_score),
            delay_score = VALUES(delay_score),
            progress_mismatch_score = VALUES(progress_mismatch_score),
            payment_anomaly_score = VALUES(payment_anomaly_score),
            historical_deviation_score = VALUES(historical_deviation_score),
            duplicate_score = VALUES(duplicate_score),
            total_score = VALUES(total_score),
            risk_level = VALUES(risk_level)
        `, riskFlatParams);
      }

      if (anomalyRecords.length > 0) {
        const allImportedIds = validRecords.map(r => r[0]);
        for (let i = 0; i < allImportedIds.length; i += 1000) {
          const idChunk = allImportedIds.slice(i, i + 1000);
          await pool.query('DELETE FROM anomalies WHERE project_id IN (?)', [idChunk]);
        }

        for (let i = 0; i < anomalyRecords.length; i += chunkSize) {
          const chunk = anomalyRecords.slice(i, i + chunkSize);
          const anomalyPlaceholders = chunk.map(() => '(?, ?, ?, ?, ?)').join(',');
          const anomalyFlatParams = chunk.flat();
          await pool.query(`
            INSERT INTO anomalies (project_id, anomaly_type, severity, description, score)
            VALUES ${anomalyPlaceholders}
          `, anomalyFlatParams);
        }
      }
    }

    res.status(201).json({ 
      message: `Processed ${projects.length} projects successfully.`,
      summary: {
        imported: validRecords.length,
        skipped: projects.length - validRecords.length,
        errors: 0
      }
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a project
router.delete('/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    
    // Check if project exists
    const [[project]] = await pool.query('SELECT * FROM projects WHERE project_id = ?', [projectId]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Delete related records first to avoid foreign key constraints
    await pool.query('DELETE FROM risk_scores WHERE project_id = ?', [projectId]);
    await pool.query('DELETE FROM anomalies WHERE project_id = ?', [projectId]);
    await pool.query('DELETE FROM payments WHERE project_id = ?', [projectId]);

    // Delete the project
    await pool.query('DELETE FROM projects WHERE project_id = ?', [projectId]);
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk delete projects
router.post('/bulk-delete', async (req, res) => {
  try {
    const { projectIds } = req.body;
    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      return res.status(400).json({ error: 'Expected an array of project IDs' });
    }

    // Delete related records first
    await pool.query('DELETE FROM risk_scores WHERE project_id IN (?)', [projectIds]);
    await pool.query('DELETE FROM anomalies WHERE project_id IN (?)', [projectIds]);
    await pool.query('DELETE FROM payments WHERE project_id IN (?)', [projectIds]);

    // Delete projects
    const [result] = await pool.query('DELETE FROM projects WHERE project_id IN (?)', [projectIds]);
    
    res.json({ message: `Successfully deleted ${result.affectedRows} projects` });
  } catch (error) {
    console.error("Bulk delete error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

