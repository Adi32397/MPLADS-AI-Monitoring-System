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
  
  const dmyMatch = val.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  
  const ymdMatch = val.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(val);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return fallback;
}

// 4. Bulk Import Processing
const processBulkImport = async (dataRows, authorizedState) => {
  let errorCount = 0;
  const errors = [];
  const validRecords = [];
  const riskRecords = [];
  const anomalyRecords = [];
  const seenIds = new Set();

  for (let index = 0; index < dataRows.length; index++) {
    const row = dataRows[index];
    const rowNum = index + 1;
    
    const projectId = getField(row, 'Project_ID', 'Project ID', 'project_id', 'ID', 'Work_ID') || ('PROJ-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 100000));
    const projectName = getField(row, 'Project_Name', 'Project Name', 'project_name', 'Work_Name', 'Name', 'Title') || 'Bulk Imported Project';
    const state = getField(row, 'State', 'state', 'State_Name') || authorizedState;
    const district = getField(row, 'District', 'district', 'District_Name') || 'General District';

    // 2. Validate Security (State Scoping if authorizedState provided)
    if (authorizedState && state.toLowerCase() !== authorizedState.toLowerCase()) {
      errorCount++;
      errors.push(`Row ${rowNum}: Unauthorized state (${state}). You can only import data for ${authorizedState}.`);
      continue;
    }

    if (seenIds.has(projectId)) continue;
    seenIds.add(projectId);

    const sanctioned = cleanNumber(getField(row, 'Sanctioned_Amount', 'Sanctioned Amount', 'sanctioned_amount', 'Amount'), 0);
    const expenditure = cleanNumber(getField(row, 'Actual_Expenditure', 'Actual Expenditure', 'actual_expenditure', 'Expenditure'), 0);
    const estCost = cleanNumber(getField(row, 'Estimated_Cost', 'Estimated Cost', 'estimated_cost'), sanctioned);
    const phyProg = Math.min(100, Math.max(0, Math.round(cleanNumber(getField(row, 'Physical_Progress', 'Physical Progress', 'physical_progress'), 0))));
    const finProg = Math.min(100, Math.max(0, Math.round(cleanNumber(getField(row, 'Financial_Progress', 'Financial Progress', 'financial_progress'), 0))));

    const validStatus = getField(row, 'Status', 'status', 'Work_Status') || 'In Progress';
    const normStatus = validStatus.toLowerCase();
    
    const csvRisk = (getField(row, 'Risk_Status', 'Risk Status', 'risk_status', 'Risk_Level', 'Risk Level') || '').toUpperCase();
    let riskLevel = 'LOW';
    let totalScore = 15;

    if (csvRisk === 'CRITICAL') {
      riskLevel = 'CRITICAL';
      totalScore = 95;
    } else if (csvRisk === 'HIGH') {
      riskLevel = 'HIGH';
      totalScore = 85;
    } else if (csvRisk === 'MEDIUM') {
      riskLevel = 'MEDIUM';
      totalScore = 50;
    } else if (csvRisk === 'LOW') {
      riskLevel = 'LOW';
      totalScore = 15;
    } else {
      if (normStatus.includes('cost overrun') || normStatus.includes('mismatch')) {
        riskLevel = 'HIGH';
        totalScore = 85;
      } else if (normStatus.includes('critical') || normStatus.includes('high risk') || (expenditure > sanctioned && sanctioned > 0)) {
        riskLevel = 'CRITICAL';
        totalScore = 95;
      } else if (normStatus.includes('delayed')) {
        riskLevel = 'MEDIUM';
        totalScore = 50;
      }
    }

    const startDate = parseDateForDb(getField(row, 'Start_Date', 'Start Date', 'start_date'), '2024-01-01');
    const expDate = parseDateForDb(getField(row, 'Expected_Completion', 'Expected Completion', 'expected_completion'), '2025-01-01');
    
    validRecords.push([
      projectId,
      projectName,
      state,
      district,
      getField(row, 'Constituency', 'constituency') || `${district} Constituency`,
      getField(row, 'Category', 'category', 'Sector', 'sector') || 'Other',
      sanctioned,
      estCost,
      expenditure,
      phyProg,
      finProg,
      startDate,
      expDate,
      getField(row, 'Implementing_Agency', 'Implementing Agency', 'implementing_agency') || 'Unknown',
      validStatus
    ]);

    riskRecords.push([
      projectId, 0, 0, 0, 0, 0, 0, totalScore, riskLevel
    ]);

    if (normStatus.includes('cost overrun') || (expenditure > sanctioned && sanctioned > 0)) {
      anomalyRecords.push([
        projectId, 'Cost Overrun', 'HIGH', `Expenditure exceeds sanctioned amount by +₹${((expenditure - sanctioned)/100000).toFixed(1)}L`, totalScore
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

  // Write valid records directly to MySQL using chunking & ON DUPLICATE KEY UPDATE
  if (validRecords.length > 0) {
    try {
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
    } catch (err) {
      console.error("Failed to write to MySQL:", err);
      throw new Error("Failed to persist data to database: " + err.message);
    }
  }

  return {
    success: true,
    summary: {
      totalProcessed: dataRows.length,
      imported: validRecords.length,
      skipped: dataRows.length - validRecords.length,
      errors: errorCount
    },
    details: errors.slice(0, 50)
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
