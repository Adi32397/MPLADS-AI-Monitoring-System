const { pool } = require('../config/db');

// Helpers
const getProjectsForState = async (stateName) => {
  if (!stateName) return [];
  const projects = await getFilteredProjects(stateName, 'All Districts');
  // Ensure risk is attached
  projects.forEach(p => {
    if (!p.risk) p.risk = calculateRiskScore(p);
  });
  return projects;
};

// 1. Dashboard KPIs (Total Projects, Sanctioned, Expenditure, Utilization, etc.)
const getStateOverview = async (stateName) => {
  const projects = await getProjectsForState(stateName);
  
  let sanctioned = 0;
  let expenditure = 0;
  let high_risk = 0;
  let delayed = 0;
  let anomalies = 0;
  let critical = 0;
  let costOverrunsCount = 0;

  projects.forEach(p => {
    sanctioned += p.Sanctioned_Amount;
    expenditure += p.Actual_Expenditure;
    
    if (p.risk.risk_level === 'HIGH') high_risk++;
    if (p.risk.risk_level === 'CRITICAL') {
      high_risk++;
      critical++;
    }
    
    // Anomaly: Significant physical/financial progress mismatch or cost overrun
    if (p.Actual_Expenditure > p.Sanctioned_Amount || (p.Financial_Progress > p.Physical_Progress + 20)) {
      anomalies++;
    }
    if (p.Actual_Expenditure > p.Sanctioned_Amount) {
      costOverrunsCount++;
    }

    const status = (p.Status || '').toLowerCase();
    if (status.includes('delay') || new Date(p.Expected_Completion) < new Date()) {
      delayed++;
    }
  });

  // Calculate Utilization
  const utilization = sanctioned > 0 ? ((expenditure / sanctioned) * 100).toFixed(1) : 0;

  return {
    total_projects: projects.length,
    sanctioned,
    expenditure,
    utilization: parseFloat(utilization),
    high_risk,
    delayed,
    anomalies,
    critical,
    costOverrunsCount
  };
};

// 2. District Rankings within State
const getDistrictRankings = async (stateName) => {
  const projects = await getProjectsForState(stateName);
  const districtMap = {};

  projects.forEach(p => {
    if (!districtMap[p.District]) {
      districtMap[p.District] = {
        name: p.District,
        projects: 0,
        sanctioned: 0,
        expenditure: 0,
        riskScoreTotal: 0,
        highRiskCount: 0,
        criticalCount: 0,
        delayed: 0,
        anomaly: 0
      };
    }
    
    const d = districtMap[p.District];
    d.projects++;
    d.sanctioned += p.Sanctioned_Amount;
    d.expenditure += p.Actual_Expenditure;
    d.riskScoreTotal += p.risk.score;
    
    if (p.risk.risk_level === 'HIGH') d.highRiskCount++;
    if (p.risk.risk_level === 'CRITICAL') d.criticalCount++;
    if (p.Actual_Expenditure > p.Sanctioned_Amount || (p.Financial_Progress > p.Physical_Progress + 20)) d.anomaly++;
    
    const status = (p.Status || '').toLowerCase();
    if (status.includes('delay') || new Date(p.Expected_Completion) < new Date()) d.delayed++;
  });

  return Object.values(districtMap).map(d => {
    const avgRisk = d.projects > 0 ? (d.riskScoreTotal / d.projects) : 0;
    let riskLevel = 'LOW';
    if (d.criticalCount > 0 || avgRisk > 75) riskLevel = 'CRITICAL';
    else if (d.highRiskCount > 0 || avgRisk > 50) riskLevel = 'HIGH';
    else if (avgRisk > 25) riskLevel = 'MEDIUM';

    return {
      name: d.name,
      projects: d.projects,
      utilization: d.sanctioned > 0 ? parseFloat(((d.expenditure / d.sanctioned) * 100).toFixed(1)) : 0,
      risk: riskLevel,
      delay: d.delayed,
      anomaly: d.anomaly,
      sanctioned: d.sanctioned,
      expenditure: d.expenditure,
      avgRiskScore: avgRisk.toFixed(1)
    };
  }).sort((a, b) => {
    // Sort logic (critical first)
    const riskWeight = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    if (riskWeight[b.risk] !== riskWeight[a.risk]) return riskWeight[b.risk] - riskWeight[a.risk];
    return b.anomaly - a.anomaly;
  });
};

// 3. Risk Distribution
const getRiskDistribution = async (stateName) => {
  const projects = await getProjectsForState(stateName);
  const dist = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  projects.forEach(p => dist[p.risk.risk_level]++);
  return [
    { name: 'Low', value: dist.LOW, color: '#10b981' },
    { name: 'Medium', value: dist.MEDIUM, color: '#eab308' },
    { name: 'High', value: dist.HIGH, color: '#f59e0b' },
    { name: 'Critical', value: dist.CRITICAL, color: '#ef4444' }
  ];
};

// 4. Bulk Import Processing
const processBulkImport = async (dataRows, authorizedState) => {
  let validCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const errors = [];
  const validRecords = [];
  const riskRecords = [];
  const anomalyRecords = [];

  // Get existing IDs from MySQL to check duplicates accurately
  const [existingRows] = await pool.query('SELECT project_id FROM projects');
  const existingIds = new Set(existingRows.map(r => r.project_id));

  for (let index = 0; index < dataRows.length; index++) {
    const row = dataRows[index];
    const rowNum = index + 1;
    
    // 1. Check Required Fields
    if (!row.Project_ID || !row.Project_Name || !row.State || !row.District) {
      errorCount++;
      errors.push(`Row ${rowNum}: Missing required fields.`);
      continue;
    }

    // 2. Validate Security (State Scoping)
    if (row.State !== authorizedState) {
      errorCount++;
      errors.push(`Row ${rowNum}: Unauthorized state (${row.State}). You can only import data for ${authorizedState}.`);
      continue;
    }

    // 3. Validate Data Types
    const sanctioned = Number(row.Sanctioned_Amount);
    const expenditure = Number(row.Actual_Expenditure);
    if (isNaN(sanctioned) || isNaN(expenditure)) {
      errorCount++;
      errors.push(`Row ${rowNum}: Invalid financial amounts.`);
      continue;
    }

    // 4. Duplicate Check
    if (existingIds.has(row.Project_ID)) {
      skippedCount++;
      errors.push(`Row ${rowNum}: Duplicate Project_ID (${row.Project_ID}) skipped.`);
      continue;
    }

    // Success
    existingIds.add(row.Project_ID);

    const rawStatus = (row.Status || '').trim();
    let validStatus = rawStatus || 'In Progress';
    let riskLevel = 'LOW';
    let totalScore = 15;

    if (rawStatus === 'Cost Overrun' || rawStatus === 'Payment-Progress Mismatch') {
      riskLevel = 'HIGH';
      totalScore = 85;
    } else if (rawStatus === 'High Risk' || (expenditure > sanctioned && sanctioned > 0)) {
      riskLevel = 'CRITICAL';
      totalScore = 95;
    } else if (rawStatus === 'Delayed') {
      riskLevel = 'MEDIUM';
      totalScore = 50;
    }
    
    validRecords.push([
      row.Project_ID,
      row.Project_Name,
      row.State,
      row.District,
      'Example Constituency', // Default
      row.Category || 'Other',
      sanctioned,
      sanctioned, // Estimated Cost default
      expenditure,
      Number(row.Physical_Progress) || 0,
      Number(row.Financial_Progress) || 0,
      row.Start_Date || new Date().toISOString().split('T')[0],
      row.Expected_Completion || '',
      row.Implementing_Agency || 'Unknown',
      validStatus
    ]);

    riskRecords.push([
      row.Project_ID, 0, 0, 0, 0, 0, 0, totalScore, riskLevel
    ]);

    if (rawStatus === 'Cost Overrun' || (expenditure > sanctioned && sanctioned > 0)) {
      anomalyRecords.push([
        row.Project_ID, 'Cost Overrun', 'HIGH', `Expenditure exceeds sanctioned amount by +₹${((expenditure - sanctioned)/100000).toFixed(1)}L`, totalScore
      ]);
    } else if (rawStatus === 'Payment-Progress Mismatch' || (Number(row.Financial_Progress) > Number(row.Physical_Progress) + 20)) {
      anomalyRecords.push([
        row.Project_ID, 'Progress Mismatch', 'HIGH', `Financial progress (${row.Financial_Progress}%) exceeds physical progress (${row.Physical_Progress}%)`, totalScore
      ]);
    } else if (rawStatus === 'High Risk' || riskLevel === 'CRITICAL') {
      anomalyRecords.push([
        row.Project_ID, 'Critical AI Risk Flag', 'CRITICAL', 'Severe anomaly detected: Combined financial deviation and abnormal trajectory', totalScore
      ]);
    }
  }

  // Write valid records directly to MySQL
  if (validRecords.length > 0) {
    try {
      const placeholders = validRecords.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
      const flatParams = validRecords.flat();
      
      await pool.query(`
        INSERT INTO projects 
        (project_id, name, state, district, constituency, category, sanctioned_amount, estimated_cost, actual_expenditure, physical_progress, financial_progress, start_date, expected_completion, implementing_agency, status) 
        VALUES ${placeholders}
      `, flatParams);

      const riskPlaceholders = riskRecords.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
      const riskFlatParams = riskRecords.flat();
      
      await pool.query(`
        INSERT INTO risk_scores (project_id, cost_overrun_score, delay_score, progress_mismatch_score, payment_anomaly_score, historical_deviation_score, duplicate_score, total_score, risk_level) 
        VALUES ${riskPlaceholders}
      `, riskFlatParams);

      if (anomalyRecords.length > 0) {
        const anomalyPlaceholders = anomalyRecords.map(() => '(?, ?, ?, ?, ?)').join(',');
        const anomalyFlatParams = anomalyRecords.flat();
        await pool.query(`
          INSERT INTO anomalies (project_id, anomaly_type, severity, description, score)
          VALUES ${anomalyPlaceholders}
        `, anomalyFlatParams);
      }

      validCount = validRecords.length;
    } catch (err) {
      console.error("Failed to write to MySQL:", err);
      throw new Error("Failed to persist data to database.");
    }
  }

  return {
    success: true,
    summary: {
      totalProcessed: dataRows.length,
      imported: validCount,
      skipped: skippedCount,
      errors: errorCount
    },
    details: errors.slice(0, 50) // Return top 50 errors
  };
};

// 5. In-Memory Escalation Store (For Prototype)
let escalations = [];

const createEscalation = (data, userState) => {
  const newEscalation = {
    id: 'ESC-' + Math.floor(Math.random() * 10000),
    ...data,
    state: userState,
    date: new Date().toISOString(),
    status: 'Escalated'
  };
  escalations.push(newEscalation);
  return newEscalation;
};

const getEscalations = (stateName) => {
  return escalations.filter(e => e.state === stateName);
};

module.exports = {
  getProjectsForState,
  getStateOverview,
  getDistrictRankings,
  getRiskDistribution,
  processBulkImport,
  createEscalation,
  getEscalations
};
