const fs = require('fs');
const path = require('path');
const { getFilteredProjects, calculateRiskScore, projectsData } = require('./financialAnalytics');

// Helpers
const getProjectsForState = (stateName) => {
  if (!stateName) return [];
  const projects = getFilteredProjects(stateName, 'All Districts');
  // Ensure risk is attached
  projects.forEach(p => {
    if (!p.risk) p.risk = calculateRiskScore(p);
  });
  return projects;
};

// 1. Dashboard KPIs (Total Projects, Sanctioned, Expenditure, Utilization, etc.)
const getStateOverview = (stateName) => {
  const projects = getProjectsForState(stateName);
  
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
const getDistrictRankings = (stateName) => {
  const projects = getProjectsForState(stateName);
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
const getRiskDistribution = (stateName) => {
  const projects = getProjectsForState(stateName);
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
  const dataPath = path.join(__dirname, '../data/MPLADS_Demo_Dataset_26102.csv');
  
  let validCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const errors = [];
  const validRecords = [];

  // Get existing IDs to check duplicates
  const existingIds = new Set(projectsData.map(p => p.Project_ID));

  dataRows.forEach((row, index) => {
    const rowNum = index + 1;
    
    // 1. Check Required Fields
    if (!row.Project_ID || !row.Project_Name || !row.State || !row.District) {
      errorCount++;
      errors.push(`Row ${rowNum}: Missing required fields.`);
      return;
    }

    // 2. Validate Security (State Scoping)
    if (row.State !== authorizedState) {
      errorCount++;
      errors.push(`Row ${rowNum}: Unauthorized state (${row.State}). You can only import data for ${authorizedState}.`);
      return;
    }

    // 3. Validate Data Types
    const sanctioned = Number(row.Sanctioned_Amount);
    const expenditure = Number(row.Actual_Expenditure);
    if (isNaN(sanctioned) || isNaN(expenditure)) {
      errorCount++;
      errors.push(`Row ${rowNum}: Invalid financial amounts.`);
      return;
    }

    // 4. Duplicate Check
    if (existingIds.has(row.Project_ID)) {
      skippedCount++;
      errors.push(`Row ${rowNum}: Duplicate Project_ID (${row.Project_ID}) skipped.`);
      return;
    }

    // Success
    validCount++;
    existingIds.add(row.Project_ID);
    
    const newRecord = {
      Project_ID: row.Project_ID,
      Project_Name: row.Project_Name,
      State: row.State,
      District: row.District,
      Category: row.Category || 'Other',
      Sanctioned_Amount: sanctioned,
      Actual_Expenditure: expenditure,
      Physical_Progress: Number(row.Physical_Progress) || 0,
      Financial_Progress: Number(row.Financial_Progress) || 0,
      Start_Date: row.Start_Date || new Date().toISOString().split('T')[0],
      Expected_Completion: row.Expected_Completion || '',
      Implementing_Agency: row.Implementing_Agency || 'Unknown',
      Status: row.Status || 'In Progress'
    };
    
    validRecords.push(newRecord);
    projectsData.push(newRecord); // Update memory
  });

  // Write valid records back to CSV
  if (validRecords.length > 0) {
    let csvString = '';
    const headers = ['Project_ID','Project_Name','State','District','Category','Sanctioned_Amount','Actual_Expenditure','Physical_Progress','Financial_Progress','Start_Date','Expected_Completion','Implementing_Agency','Status'];
    
    validRecords.forEach(record => {
      const line = headers.map(h => {
        let val = record[h] !== undefined ? record[h] : '';
        // Wrap in quotes if contains comma
        if (typeof val === 'string' && val.includes(',')) {
          val = `"${val}"`;
        }
        return val;
      }).join(',');
      csvString += '\n' + line;
    });

    try {
      fs.appendFileSync(dataPath, csvString);
    } catch (err) {
      console.error("Failed to write to CSV:", err);
      throw new Error("Failed to persist data to CSV.");
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
