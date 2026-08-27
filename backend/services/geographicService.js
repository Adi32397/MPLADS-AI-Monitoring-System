const { getFilteredProjects, calculateRiskScore } = require('./financialAnalytics');

const calculateOverview = (projects) => {
  let totalProjects = projects.length;
  let totalSanctioned = 0;
  let totalExpenditure = 0;
  let delayedCount = 0;
  let highRiskCount = 0;
  let criticalCount = 0;
  let totalRiskScore = 0;
  let costOverruns = 0;

  projects.forEach(p => {
    // Dynamically calculate risk if not present
    if (!p.risk) {
      p.risk = calculateRiskScore(p);
    }

    totalSanctioned += p.Sanctioned_Amount;
    totalExpenditure += p.Actual_Expenditure;
    
    if (p.risk.risk_level === 'HIGH') highRiskCount++;
    if (p.risk.risk_level === 'CRITICAL') criticalCount++;
    totalRiskScore += p.risk.score;
    
    if (p.Actual_Expenditure > p.Sanctioned_Amount) {
      costOverruns++;
    }

    const status = (p.Status || '').toLowerCase();
    if (status.includes('delay') || new Date(p.Expected_Completion) < new Date()) {
      delayedCount++;
    }
  });

  const avgRisk = totalProjects > 0 ? (totalRiskScore / totalProjects).toFixed(1) : 0;
  
  return {
    totalProjects,
    totalSanctioned,
    totalExpenditure,
    highRiskCount,
    criticalCount,
    projectIds: projects.map(p => p.Project_ID),
    avgRiskScore: parseFloat(avgRisk),
    delayedCount,
    costOverruns
  };
};

const getGeographicOverview = () => {
  const allProjects = getFilteredProjects('All States', 'All Districts');
  
  const stateMap = {};
  allProjects.forEach(p => {
    if (!stateMap[p.State]) stateMap[p.State] = [];
    stateMap[p.State].push(p);
  });

  const stateData = Object.keys(stateMap).map(state => {
    const stats = calculateOverview(stateMap[state]);
    return { State: state, ...stats };
  });

  return stateData.sort((a, b) => b.avgRiskScore - a.avgRiskScore);
};

const getStateOverview = (stateName) => {
  const allProjects = getFilteredProjects('All States', 'All Districts');
  const stateProjects = allProjects.filter(p => p.State === stateName);
  
  const districtMap = {};
  stateProjects.forEach(p => {
    if (!districtMap[p.District]) districtMap[p.District] = [];
    districtMap[p.District].push(p);
  });

  const districtData = Object.keys(districtMap).map(district => {
    const stats = calculateOverview(districtMap[district]);
    return { District: district, ...stats };
  });

  return districtData.sort((a, b) => b.avgRiskScore - a.avgRiskScore);
};

const getAllDistrictsOverview = () => {
  const allProjects = getFilteredProjects('All States', 'All Districts');
  const districtMap = {};
  allProjects.forEach(p => {
    if (!districtMap[p.District]) districtMap[p.District] = [];
    districtMap[p.District].push(p);
  });

  return Object.keys(districtMap).map(district => {
    const stats = calculateOverview(districtMap[district]);
    return { District: district, ...stats };
  }).sort((a, b) => b.avgRiskScore - a.avgRiskScore);
};

const getDistrictProjects = (districtName) => {
  const projects = getFilteredProjects('All States', districtName);
  projects.forEach(p => {
    if (!p.risk) p.risk = calculateRiskScore(p);
  });
  return projects.sort((a, b) => b.risk.score - a.risk.score);
};

const getCategoryRisk = () => {
  const allProjects = getFilteredProjects('All States', 'All Districts');
  const catMap = {};
  allProjects.forEach(p => {
    if (!catMap[p.Category]) catMap[p.Category] = [];
    catMap[p.Category].push(p);
  });
  
  return Object.keys(catMap).map(cat => {
    const stats = calculateOverview(catMap[cat]);
    return { Category: cat, ...stats };
  }).sort((a, b) => b.avgRiskScore - a.avgRiskScore);
};

const getAgencyRisk = () => {
  const allProjects = getFilteredProjects('All States', 'All Districts');
  const agencyMap = {};
  allProjects.forEach(p => {
    if (!agencyMap[p.Implementing_Agency]) agencyMap[p.Implementing_Agency] = [];
    agencyMap[p.Implementing_Agency].push(p);
  });
  
  return Object.keys(agencyMap).map(agency => {
    const stats = calculateOverview(agencyMap[agency]);
    return { Agency: agency, ...stats };
  }).sort((a, b) => b.avgRiskScore - a.avgRiskScore);
};

module.exports = {
  getGeographicOverview,
  getStateOverview,
  getAllDistrictsOverview,
  getDistrictProjects,
  getCategoryRisk,
  getAgencyRisk,
  calculateOverview
};
