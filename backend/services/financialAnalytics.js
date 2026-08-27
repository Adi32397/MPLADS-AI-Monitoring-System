const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

let projectsData = [];

// Load CSV into memory
const loadData = () => {
  return new Promise((resolve, reject) => {
    const dataPath = path.join(__dirname, '../data/MPLADS_Demo_Dataset_26102.csv');
    const results = [];
    
    if (!fs.existsSync(dataPath)) {
      console.warn("CSV File not found at", dataPath);
      return resolve([]);
    }

    fs.createReadStream(dataPath)
      .pipe(csv())
      .on('data', (data) => {
        // Parse numerical fields safely
        results.push({
          ...data,
          Sanctioned_Amount: Number(data.Sanctioned_Amount) || 0,
          Actual_Expenditure: Number(data.Actual_Expenditure) || 0,
          Physical_Progress: Number(data.Physical_Progress) || 0,
          Financial_Progress: Number(data.Financial_Progress) || 0
        });
      })
      .on('end', () => {
        projectsData = results;
        console.log(`Successfully loaded ${projectsData.length} projects from CSV.`);
        resolve(projectsData);
      })
      .on('error', reject);
  });
};

const getFilteredProjects = (state, district) => {
  let filtered = projectsData;
  if (state && state !== 'All States') {
    filtered = filtered.filter(p => p.State === state);
  }
  if (district && district !== 'All Districts') {
    filtered = filtered.filter(p => p.District === district);
  }
  return filtered;
};

const calculateRiskScore = (project) => {
  let score = 0;
  let reasons = [];
  
  const sanctioned = project.Sanctioned_Amount;
  const expended = project.Actual_Expenditure;
  const finProgress = project.Financial_Progress;
  const physProgress = project.Physical_Progress;
  
  // Rule 1: Cost Overrun
  if (expended > sanctioned && sanctioned > 0) {
    const overrun = expended - sanctioned;
    const overrunPct = (overrun / sanctioned) * 100;
    score += Math.min(overrunPct * 2, 60); 
    reasons.push(`🔴 Significant Cost Overrun: Actual expenditure is ${overrunPct.toFixed(1)}% higher than the sanctioned amount (+₹${(overrun/100000).toFixed(1)}L).`);
  }
  
  // Rule 2: Progress Mismatch
  if (finProgress > physProgress + 15) {
    const gap = finProgress - physProgress;
    score += Math.min(gap, 40); 
    reasons.push(`🔴 Financial-Physical Progress Mismatch: Financial progress is ${finProgress.toFixed(1)}%, while physical progress is only ${physProgress.toFixed(1)}% (Gap: ${gap.toFixed(1)} pts).`);
  }
  
  // Rule 3: Low Physical Progress
  if (physProgress < 30 && finProgress > 50) {
    score += 15;
    reasons.push(`🟠 Low Physical Progress vs High Spend: Only ${physProgress}% of work is completed despite high relative spending.`);
  }

  // Rule 4: Delayed status
  const status = (project.Status || '').toLowerCase();
  if (status.includes('delay') || status.includes('overrun') || status.includes('mismatch')) {
    score += 20;
    reasons.push(`🟠 Project Status Flagged: Officially marked as ${project.Status}.`);
  }
  
  score = Math.min(Math.round(score), 99);
  if (score === 0) score = Math.floor(Math.random() * 15); // Add a small baseline risk
  
  let risk_level = 'LOW';
  if (score >= 75) risk_level = 'CRITICAL';
  else if (score >= 50) risk_level = 'HIGH';
  else if (score >= 25) risk_level = 'MEDIUM';
  
  let assessment = "Project is tracking normally with no major financial red flags.";
  if (risk_level === 'CRITICAL' || risk_level === 'HIGH') {
    assessment = "Multiple financial indicators deviate significantly from expected project patterns. This project requires financial verification and closer monitoring.";
  } else if (risk_level === 'MEDIUM') {
    assessment = "Minor discrepancies found in financial execution. Routine monitoring recommended.";
  }

  return { score, risk_level, reasons, assessment };
};

const getFinancialSummary = (state, district) => {
  const projects = getFilteredProjects(state, district);
  let totalSanctioned = 0;
  let totalExpenditure = 0;
  let anomaliesCount = 0;

  projects.forEach(p => {
    totalSanctioned += p.Sanctioned_Amount;
    totalExpenditure += p.Actual_Expenditure;
    
    // Quick anomaly check
    if (p.Actual_Expenditure > p.Sanctioned_Amount || (p.Financial_Progress > p.Physical_Progress + 20)) {
      anomaliesCount++;
    }
  });

  const remaining = Math.max(0, totalSanctioned - totalExpenditure);
  const utilization = totalSanctioned > 0 ? (totalExpenditure / totalSanctioned) * 100 : 0;

  return {
    total_projects: projects.length,
    total_sanctioned: totalSanctioned,
    total_expenditure: totalExpenditure,
    remaining_amount: remaining,
    utilization_percentage: utilization,
    anomalies_count: anomaliesCount
  };
};

const getFinancialAlerts = (state, district) => {
  const projects = getFilteredProjects(state, district);
  const scoredProjects = projects.map(p => {
    const risk = calculateRiskScore(p);
    return { ...p, risk };
  });
  
  // Sort by highest risk score first
  return scoredProjects.sort((a, b) => b.risk.score - a.risk.score);
};

const getFinancialAnalytics = (state, district) => {
  const alerts = getFinancialAlerts(state, district);
  
  // Risk Distribution
  const riskDistribution = {
    LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0
  };
  alerts.forEach(p => riskDistribution[p.risk.risk_level]++);

  // Top 10 critical/high
  const topRisks = alerts.slice(0, 10);

  // Category wise performance
  const categories = {};
  alerts.forEach(p => {
    const cat = p.Category || 'Other';
    if (!categories[cat]) categories[cat] = { sanctioned: 0, expenditure: 0 };
    categories[cat].sanctioned += p.Sanctioned_Amount;
    categories[cat].expenditure += p.Actual_Expenditure;
  });

  return {
    risk_distribution: [
      { name: 'Low Risk', value: riskDistribution.LOW, fill: '#10b981' },
      { name: 'Medium Risk', value: riskDistribution.MEDIUM, fill: '#facc15' },
      { name: 'High Risk', value: riskDistribution.HIGH, fill: '#f97316' },
      { name: 'Critical', value: riskDistribution.CRITICAL, fill: '#ef4444' }
    ],
    category_performance: Object.keys(categories).map(k => ({
      name: k,
      sanctioned: categories[k].sanctioned,
      expenditure: categories[k].expenditure
    })),
    top_risks: topRisks
  };
};

const getProjectById = (id) => {
  const project = projectsData.find(p => p.Project_ID === id);
  if (!project) return null;
  const risk = calculateRiskScore(project);
  return { ...project, risk };
};

// Initial load
loadData();

module.exports = {
  getFilteredProjects,
  calculateRiskScore,
  getFinancialSummary,
  getFinancialAlerts,
  getFinancialAnalytics,
  getProjectById,
  projectsData,
  loadData
};
