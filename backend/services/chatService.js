const financialAnalytics = require('./financialAnalytics');
const { pool } = require('../config/db');

/**
 * Format currency nicely (Lakhs or Crores)
 */
function formatMoney(amount) {
  const num = Number(amount) || 0;
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  return `₹${(num / 100000).toFixed(2)} Lakh`;
}

/**
 * Format date nicely (YYYY-MM-DD)
 */
function formatDate(dateVal) {
  if (!dateVal) return 'N/A';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal).slice(0, 10);
    return d.toISOString().slice(0, 10);
  } catch {
    return String(dateVal);
  }
}

/**
 * Get risk badge text with emoji
 */
function getRiskBadge(level, score) {
  const normLevel = (level || 'LOW').toUpperCase();
  const emoji = normLevel === 'CRITICAL' ? '🔴' : normLevel === 'HIGH' ? '🟠' : normLevel === 'MEDIUM' ? '🟡' : '🟢';
  return `${emoji} **${normLevel}** (Risk Score: ${score || 0}/100)`;
}

/**
 * Enriches a raw project with calculated risk score and level if not present
 */
function enrichWithRisk(proj) {
  if (proj.Risk_Score !== undefined && proj.Risk_Level) return proj;
  const risk = financialAnalytics.calculateRiskScore(proj);
  return {
    ...proj,
    Risk_Score: risk.score,
    Risk_Level: risk.risk_level
  };
}

/**
 * Fetches full project data including risk scores and anomalies from MySQL
 */
async function fetchFullProject(projectId) {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, r.total_score as risk_score, r.risk_level, r.cost_overrun_score, r.delay_score, r.progress_mismatch_score 
      FROM projects p
      LEFT JOIN risk_scores r ON p.project_id = r.project_id
      WHERE LOWER(TRIM(p.project_id)) = LOWER(TRIM(?))
    `, [projectId]);

    if (rows.length === 0) return null;
    const p = rows[0];

    const [anomRows] = await pool.query(`
      SELECT anomaly_type, severity, description, score 
      FROM anomalies 
      WHERE LOWER(TRIM(project_id)) = LOWER(TRIM(?))
    `, [projectId]);

    return {
      Project_ID: p.project_id,
      Project_Name: p.name,
      State: p.state,
      District: p.district,
      Constituency: p.constituency || p.district,
      Category: p.category,
      Sanctioned_Amount: Number(p.sanctioned_amount) || 0,
      Estimated_Cost: Number(p.estimated_cost) || 0,
      Actual_Expenditure: Number(p.actual_expenditure) || 0,
      Physical_Progress: Number(p.physical_progress) || 0,
      Financial_Progress: Number(p.financial_progress) || 0,
      Start_Date: formatDate(p.start_date),
      Expected_Completion: formatDate(p.expected_completion),
      Actual_Completion: p.actual_completion ? formatDate(p.actual_completion) : null,
      Implementing_Agency: p.implementing_agency || 'District Administration',
      Status: p.status || 'In Progress',
      Risk_Level: p.risk_level || 'LOW',
      Risk_Score: p.risk_score || 0,
      Anomalies: anomRows || []
    };
  } catch (err) {
    console.error('Error in fetchFullProject:', err);
    return null;
  }
}

/**
 * Searches the MySQL database for context relevant to the user's message
 */
async function retrieveContext(message, userContext) {
  const stateScope = userContext.role === 'state' && userContext.state ? userContext.state : 'All States';
  const allProjects = await financialAnalytics.getFilteredProjects(stateScope, 'All Districts');
  const summary = await financialAnalytics.getFinancialSummary(stateScope, 'All Districts');

  return {
    totalScanned: allProjects.length,
    allProjects,
    summary: summary || { total_sanctioned: 0, total_expenditure: 0, utilization_percentage: 0, anomalies_count: 0 }
  };
}

/**
 * Answers question about a specific, found project
 */
function answerProjectSpecificQuestion(p, message) {
  const msgLower = message.toLowerCase();
  const pId = p.Project_ID;
  const pName = p.Project_Name;
  const badge = getRiskBadge(p.Risk_Level, p.Risk_Score);

  // 1. Budget / Sanctioned Amount / Cost / Funds
  if (/\b(budget|sanction|sanctioned|cost|amount|allotted|allocated|fund|how much money)\b/i.test(msgLower) && !msgLower.includes('spent') && !msgLower.includes('expenditure')) {
    const isOverrun = p.Actual_Expenditure > p.Sanctioned_Amount;
    const diff = Math.abs(p.Actual_Expenditure - p.Sanctioned_Amount);
    return [
      `💰 **Budget & Financial Sanction — ${pId} (${pName})**`,
      ``,
      `• **Sanctioned Amount:** ${formatMoney(p.Sanctioned_Amount)}`,
      `• **Actual Expenditure:** ${formatMoney(p.Actual_Expenditure)}`,
      `• **Fund Utilization Rate:** ${p.Financial_Progress}%`,
      `• **Current Balance:** ${formatMoney(Math.max(0, p.Sanctioned_Amount - p.Actual_Expenditure))}`,
      isOverrun 
        ? `⚠️ **Budget Overrun Detected:** Actual expenditure exceeds sanctioned budget by **+${formatMoney(diff)}** (+${((diff/p.Sanctioned_Amount)*100).toFixed(1)}%)!` 
        : `✅ **Within Budget:** Expenditure is currently within the approved allocation.`
    ].join('\n');
  }

  // 2. Expenditure / Spent
  if (/\b(spent|expenditure|spending|spent so far|used)\b/i.test(msgLower)) {
    const isOverrun = p.Actual_Expenditure > p.Sanctioned_Amount;
    return [
      `💸 **Expenditure Breakdown — ${pId} (${pName})**`,
      ``,
      `• **Total Spent to Date:** ${formatMoney(p.Actual_Expenditure)}`,
      `• **Sanctioned Allocation:** ${formatMoney(p.Sanctioned_Amount)}`,
      `• **Financial Progress:** ${p.Financial_Progress}%`,
      `• **Physical Progress on Ground:** ${p.Physical_Progress}%`,
      isOverrun 
        ? `⚠️ **Warning:** Project has spent **${formatMoney(p.Actual_Expenditure - p.Sanctioned_Amount)}** beyond its authorized limit.` 
        : `• **Remaining Funds:** ${formatMoney(p.Sanctioned_Amount - p.Actual_Expenditure)} available to disburse.`
    ].join('\n');
  }

  // 3. Implementing Agency / Contractor / Department
  if (/\b(agency|contractor|department|who is building|who is executing|who is implementing|who)\b/i.test(msgLower)) {
    return [
      `🏢 **Implementing Agency — ${pId} (${pName})**`,
      ``,
      `• **Agency Responsible:** **${p.Implementing_Agency}**`,
      `• **Jurisdiction:** ${p.District}, ${p.State}`,
      `• **Sector / Category:** ${p.Category}`,
      `• **Execution Status:** ${p.Status}`,
      `• **AI Risk Level:** ${badge}`
    ].join('\n');
  }

  // 4. Progress (Physical vs Financial)
  if (/\b(progress|physical|financial progress|how much completed|percentage|done)\b/i.test(msgLower)) {
    const gap = p.Financial_Progress - p.Physical_Progress;
    return [
      `📈 **Execution & Progress Report — ${pId} (${pName})**`,
      ``,
      `• **Physical Ground Progress:** **${p.Physical_Progress}%**`,
      `• **Financial Progress (Disbursed):** **${p.Financial_Progress}%**`,
      `• **Status:** ${p.Status}`,
      gap > 20 
        ? `⚠️ **Anomaly Alert:** Financial expenditure (${p.Financial_Progress}%) is outstripping physical progress (${p.Physical_Progress}%) by **+${gap}%**. This indicates possible payment front-loading or milestone mismatch.` 
        : `✅ **Progress Balance:** Financial disbursement aligns reasonably with verified physical execution.`
    ].join('\n');
  }

  // 5. Timeline / Dates / Start / Expected Completion / Deadline
  if (/\b(when|timeline|deadline|start date|completion date|expected completion|finish|date|schedule)\b/i.test(msgLower)) {
    const isDelayed = p.Status.toLowerCase().includes('delay');
    return [
      `📅 **Timeline & Schedule — ${pId} (${pName})**`,
      ``,
      `• **Start Date:** ${p.Start_Date}`,
      `• **Expected Completion Date:** ${p.Expected_Completion}`,
      `• **Current Lifecycle Status:** **${p.Status}**`,
      `• **Physical Progress:** ${p.Physical_Progress}% complete`,
      isDelayed 
        ? `⏱️ **Delay Flag:** This project is recorded behind schedule. District officers should initiate physical verification.` 
        : `✅ **Schedule:** Project is moving along its recorded timeframe.`
    ].join('\n');
  }

  // 6. Location / District / State / Constituency
  if (/\b(where|location|district|state|constituency|place)\b/i.test(msgLower)) {
    return [
      `📍 **Geographic Location — ${pId} (${pName})**`,
      ``,
      `• **District:** ${p.District}`,
      `• **State:** ${p.State}`,
      `• **Constituency:** ${p.Constituency}`,
      `• **Implementing Agency:** ${p.Implementing_Agency}`
    ].join('\n');
  }

  // 7. Risk / Anomalies / Fraud / Why flagged
  if (/\b(risk|anomaly|anomalies|flag|flagged|fraud|issue|problem|warning|why)\b/i.test(msgLower)) {
    const anomalyDetails = p.Anomalies.length > 0 
      ? p.Anomalies.map((a, i) => `  ${i+1}. [${a.severity}] **${a.anomaly_type}:** ${a.description}`).join('\n')
      : '  • No specific fraud anomalies recorded in the AI audit ledger.';

    return [
      `🛡️ **AI Risk Assessment — ${pId} (${pName})**`,
      ``,
      `• **Risk Classification:** ${badge}`,
      `• **Identified AI Anomalies:**`,
      anomalyDetails,
      ``,
      `• **Financial Variance:** Sanctioned ${formatMoney(p.Sanctioned_Amount)} | Spent ${formatMoney(p.Actual_Expenditure)}`,
      `• **Progress Variance:** Physical ${p.Physical_Progress}% vs Financial ${p.Financial_Progress}%`,
      p.Risk_Level === 'CRITICAL' || p.Risk_Level === 'HIGH' 
        ? `⚠️ **Recommendation:** Priority escalation for on-site physical inspection and milestone audit.` 
        : `✅ Project is assessed under normal monitoring tolerances.`
    ].join('\n');
  }

  // 8. Default: Complete Detailed Dossier
  const anomaliesText = p.Anomalies.length > 0 
    ? p.Anomalies.map(a => `⚠️ *[${a.severity}] ${a.anomaly_type}:* ${a.description}`).join('\n• ')
    : 'No active anomalies detected.';

  return [
    `📋 **Project Details Dossier — ${pId}**`,
    ``,
    `• **Name:** ${pName}`,
    `• **Sector / Category:** ${p.Category}`,
    `• **Location:** ${p.District}, ${p.State} (${p.Constituency})`,
    `• **Status:** ${p.Status}`,
    `• **AI Risk Level:** ${badge}`,
    `• **Sanctioned Amount:** ${formatMoney(p.Sanctioned_Amount)}`,
    `• **Actual Expenditure:** ${formatMoney(p.Actual_Expenditure)}`,
    `• **Execution Progress:** Physical: ${p.Physical_Progress}% | Financial: ${p.Financial_Progress}%`,
    `• **Timeline:** ${p.Start_Date} ➔ ${p.Expected_Completion}`,
    `• **Agency:** ${p.Implementing_Agency}`,
    `• **AI Anomalies:** ${anomaliesText}`
  ].join('\n');
}

/**
 * Main chat handler
 */
async function generateChatResponse(message, userContext) {
  const contextData = await retrieveContext(message, userContext);
  const msgTrimmed = message.trim();
  const msgLower = msgTrimmed.toLowerCase();

  // =========================================================================
  // 1. SPECIFIC PROJECT ID INQUIRIES (e.g. MPL-2026-2002, PROJ-12345, 2002)
  // =========================================================================
  const idMatch = msgTrimmed.match(/MPL-[A-Za-z0-9-]+/i) || msgTrimmed.match(/PROJ-[A-Za-z0-9-]+/i);
  let requestedId = idMatch ? idMatch[0].trim() : null;

  // Also check if user typed e.g. "project 2002" or "project id 1045"
  if (!requestedId) {
    const numMatch = msgTrimmed.match(/\b(?:project\s*(?:id)?\s*#?\s*)(\d{3,5})\b/i);
    if (numMatch) {
      requestedId = `MPL-2026-${numMatch[1]}`;
    }
  }

  if (requestedId) {
    const fullProj = await fetchFullProject(requestedId);
    if (fullProj) {
      return answerProjectSpecificQuestion(fullProj, msgTrimmed);
    } else {
      // If exact ID not found, search if any project ID contains this substring
      const partial = contextData.allProjects.find(p => p.Project_ID.toLowerCase().includes(requestedId.toLowerCase()));
      if (partial) {
        const fullPartial = await fetchFullProject(partial.Project_ID);
        if (fullPartial) return answerProjectSpecificQuestion(fullPartial, msgTrimmed);
      }
      return `❌ Could not find any project matching ID **${requestedId}** in the database. Please verify the Project ID.`;
    }
  }

  // =========================================================================
  // 2. PROJECT SEARCH BY NAME OR TITLE PHRASE
  // =========================================================================
  if (msgLower.startsWith('tell me about') || msgLower.startsWith('details of') || msgLower.startsWith('search project') || msgLower.startsWith('find project') || msgLower.startsWith('status of')) {
    const searchPhrase = msgLower
      .replace(/^(tell me about|details of|details related to|search project|find project|status of|what is the status of)\s*/i, '')
      .replace(/project\s*/i, '')
      .trim();

    if (searchPhrase.length >= 3) {
      try {
        const [matchedRows] = await pool.query(`
          SELECT p.*, r.total_score, r.risk_level 
          FROM projects p 
          LEFT JOIN risk_scores r ON p.project_id = r.project_id
          WHERE LOWER(p.name) LIKE ? OR LOWER(p.category) LIKE ?
          LIMIT 5
        `, [`%${searchPhrase}%`, `%${searchPhrase}%`]);

        if (matchedRows.length === 1) {
          const fullMatch = await fetchFullProject(matchedRows[0].project_id);
          if (fullMatch) return answerProjectSpecificQuestion(fullMatch, msgTrimmed);
        } else if (matchedRows.length > 1) {
          const list = matchedRows.map(p => `• **${p.project_id}** — ${p.name} (${p.district}, ${p.state}) | ${formatMoney(p.sanctioned_amount)} | Status: ${p.status}`).join('\n');
          return `🔎 **Found ${matchedRows.length} projects matching "${searchPhrase}":**\n\n${list}\n\n*Type any Project ID (e.g. "${matchedRows[0].project_id}") for detailed analysis.*`;
        }
      } catch (err) {
        console.error('Error searching projects by name:', err);
      }
    }
  }

  // =========================================================================
  // 3. COST OVERRUN & BUDGET EXCEEDED QUERIES
  // =========================================================================
  if (/\b(overrun|over budget|cost overrun|exceeded budget|exceeding sanctioned|overruns)\b/i.test(msgLower)) {
    const overruns = contextData.allProjects
      .filter(p => p.Actual_Expenditure > p.Sanctioned_Amount || (p.Status || '').toLowerCase().includes('cost overrun'))
      .sort((a, b) => (b.Actual_Expenditure - b.Sanctioned_Amount) - (a.Actual_Expenditure - a.Sanctioned_Amount));

    if (overruns.length > 0) {
      const list = overruns.slice(0, 5).map((p, i) => {
        const diff = p.Actual_Expenditure - p.Sanctioned_Amount;
        return `${i + 1}. **${p.Project_ID} — ${p.Project_Name}**\n   • **District:** ${p.District} (${p.State}) | **Agency:** ${p.Implementing_Agency}\n   • **Sanctioned:** ${formatMoney(p.Sanctioned_Amount)} ➔ **Expended:** ${formatMoney(p.Actual_Expenditure)}\n   • **Overrun:** ⚠️ **+${formatMoney(diff)}** (+${((diff/p.Sanctioned_Amount)*100).toFixed(1)}%)\n   • **Risk:** 🔴 ${p.risk?.risk_level || 'HIGH'}`;
      }).join('\n\n');

      return `⚠️ **Projects with Cost Overruns (${overruns.length} detected):**\n\n${list}\n\n*These projects have spent funds in excess of sanctioned allocations.*`;
    }
    return `✅ No projects with cost overruns detected in your jurisdiction.`;
  }

  // =========================================================================
  // 4. PAYMENT-PROGRESS MISMATCH QUERIES
  // =========================================================================
  if (/\b(mismatch|payment mismatch|progress mismatch|front loading|payment-progress)\b/i.test(msgLower)) {
    const mismatches = contextData.allProjects
      .filter(p => (p.Financial_Progress > p.Physical_Progress + 20) || (p.Status || '').toLowerCase().includes('mismatch'))
      .sort((a, b) => (b.Financial_Progress - b.Physical_Progress) - (a.Financial_Progress - a.Physical_Progress));

    if (mismatches.length > 0) {
      const list = mismatches.slice(0, 5).map((p, i) => {
        const gap = p.Financial_Progress - p.Physical_Progress;
        return `${i + 1}. **${p.Project_ID} — ${p.Project_Name}**\n   • **District:** ${p.District} (${p.State})\n   • **Progress:** Financial ${p.Financial_Progress}% vs Physical ${p.Physical_Progress}% (Gap: **+${gap}%**)\n   • **Funds Spent:** ${formatMoney(p.Actual_Expenditure)} of ${formatMoney(p.Sanctioned_Amount)}`;
      }).join('\n\n');

      return `⚠️ **Payment-Progress Mismatches (${mismatches.length} detected):**\n\n${list}\n\n*Financial disbursements on these projects significantly outpace physical completion.*`;
    }
    return `✅ No severe payment-progress mismatches detected.`;
  }

  // =========================================================================
  // 5. SUPERLATIVES (Highest Budget, Most Expensive, Highest Spent, Lowest Progress)
  // =========================================================================
  if (/\b(highest budget|most expensive|largest project|highest sanctioned|biggest project|top budget)\b/i.test(msgLower)) {
    const topBudget = [...contextData.allProjects].sort((a, b) => b.Sanctioned_Amount - a.Sanctioned_Amount).slice(0, 3);
    const list = topBudget.map((p, i) => `${i + 1}. **${p.Project_ID} — ${p.Project_Name}**\n   • **Budget:** **${formatMoney(p.Sanctioned_Amount)}** | **Spent:** ${formatMoney(p.Actual_Expenditure)}\n   • **District:** ${p.District}, ${p.State} | **Status:** ${p.Status}`).join('\n\n');
    return `💎 **Top Projects with Largest Approved Budgets:**\n\n${list}`;
  }

  if (/\b(highest expenditure|most spent|spent the most|highest spending)\b/i.test(msgLower)) {
    const topSpent = [...contextData.allProjects].sort((a, b) => b.Actual_Expenditure - a.Actual_Expenditure).slice(0, 3);
    const list = topSpent.map((p, i) => `${i + 1}. **${p.Project_ID} — ${p.Project_Name}**\n   • **Spent:** **${formatMoney(p.Actual_Expenditure)}** (Budget: ${formatMoney(p.Sanctioned_Amount)})\n   • **District:** ${p.District}, ${p.State} | **Progress:** ${p.Physical_Progress}%`).join('\n\n');
    return `💸 **Projects with Highest Actual Expenditure:**\n\n${list}`;
  }

  if (/\b(lowest progress|least progress|least completed|lowest physical)\b/i.test(msgLower)) {
    const lowest = [...contextData.allProjects]
      .filter(p => p.Status !== 'Completed')
      .sort((a, b) => a.Physical_Progress - b.Physical_Progress)
      .slice(0, 3);
    const list = lowest.map((p, i) => `${i + 1}. **${p.Project_ID} — ${p.Project_Name}**\n   • **Physical Progress:** **${p.Physical_Progress}%** (Financial: ${p.Financial_Progress}%)\n   • **District:** ${p.District} | **Status:** ${p.Status}`).join('\n\n');
    return `📉 **Active Projects with Lowest Physical Progress:**\n\n${list}`;
  }

  // =========================================================================
  // 6. CATEGORY / SECTOR QUERIES
  // =========================================================================
  const categories = ['Education', 'Healthcare', 'Roads', 'Water', 'Sanitation', 'Community', 'Infrastructure'];
  for (const cat of categories) {
    if (msgLower.includes(cat.toLowerCase()) || 
       (cat === 'Education' && (msgLower.includes('school') || msgLower.includes('college') || msgLower.includes('student'))) ||
       (cat === 'Healthcare' && (msgLower.includes('health') || msgLower.includes('hospital') || msgLower.includes('medical') || msgLower.includes('clinic'))) ||
       (cat === 'Roads' && (msgLower.includes('road') || msgLower.includes('highway') || msgLower.includes('bridge') || msgLower.includes('street'))) ||
       (cat === 'Water' && (msgLower.includes('drinking water') || msgLower.includes('pipeline') || msgLower.includes('water supply'))) ||
       (cat === 'Sanitation' && (msgLower.includes('drainage') || msgLower.includes('sewer') || msgLower.includes('toilet') || msgLower.includes('solid waste')))) {
      
      const catProjects = contextData.allProjects.filter(p => (p.Category || '').toLowerCase() === cat.toLowerCase());
      if (catProjects.length > 0) {
        const totalCatSanctioned = catProjects.reduce((acc, p) => acc + p.Sanctioned_Amount, 0);
        const totalCatSpent = catProjects.reduce((acc, p) => acc + p.Actual_Expenditure, 0);
        const highRiskInCat = catProjects.filter(p => p.risk?.risk_level === 'HIGH' || p.risk?.risk_level === 'CRITICAL').length;
        const delayedInCat = catProjects.filter(p => (p.Status || '').toLowerCase().includes('delay')).length;

        const sampleProjects = catProjects.slice(0, 4).map(p => 
          `• **${p.Project_ID}** — ${p.Project_Name} (${p.District})\n  Sanctioned: ${formatMoney(p.Sanctioned_Amount)} | Spent: ${formatMoney(p.Actual_Expenditure)} | Status: ${p.Status}`
        ).join('\n');

        return [
          `🏗️ **${cat} Sector Summary (${catProjects.length} Projects):**`,
          ``,
          `• **Total Sanctioned:** ${formatMoney(totalCatSanctioned)}`,
          `• **Total Expenditure:** ${formatMoney(totalCatSpent)}`,
          `• **High/Critical Risk Projects:** ${highRiskInCat}`,
          `• **Delayed Projects:** ${delayedInCat}`,
          ``,
          `**Sample Projects in ${cat}:**`,
          sampleProjects,
          ``,
          `*Ask about any specific Project ID above for full details.*`
        ].join('\n');
      }
    }
  }

  // =========================================================================
  // 7. LOCATION, DISTRICT & STATE QUERIES
  // =========================================================================
  const districts = [...new Set(contextData.allProjects.map(p => p.District))].filter(Boolean);
  const states = [...new Set(contextData.allProjects.map(p => p.State))].filter(Boolean);

  // Check if a specific known district is mentioned
  const matchedDistrict = districts.find(d => msgLower.includes(d.toLowerCase()));
  
  // Check if a specific known state is mentioned
  const matchedState = !matchedDistrict ? states.find(s => msgLower.includes(s.toLowerCase())) : null;

  const wantsAll = /\b(all|list all|every|full list|show all)\b/i.test(msgLower);

  if (matchedDistrict) {
    const dProjects = contextData.allProjects
      .filter(p => (p.District || '').toLowerCase() === matchedDistrict.toLowerCase())
      .sort((a, b) => (b.risk?.score || 0) - (a.risk?.score || 0));

    const totalDSanctioned = dProjects.reduce((acc, p) => acc + p.Sanctioned_Amount, 0);
    const totalDSpent = dProjects.reduce((acc, p) => acc + p.Actual_Expenditure, 0);
    const dDelayed = dProjects.filter(p => (p.Status || '').toLowerCase().includes('delay')).length;
    const dCritical = dProjects.filter(p => p.risk?.risk_level === 'CRITICAL').length;
    const dHigh = dProjects.filter(p => p.risk?.risk_level === 'HIGH').length;

    // If user asked "list all the project" or "all", display full list up to 15
    const limit = wantsAll ? 15 : 5;
    const projectRows = dProjects.slice(0, limit).map((p, i) => {
      const badge = getRiskBadge(p.risk?.risk_level, p.risk?.score);
      return `${i + 1}. **${p.Project_ID}** — ${p.Project_Name}\n   • Category: ${p.Category} | Agency: ${p.Implementing_Agency}\n   • Sanctioned: ${formatMoney(p.Sanctioned_Amount)} | Spent: ${formatMoney(p.Actual_Expenditure)} (Progress: ${p.Physical_Progress}%)\n   • Status: ${p.Status} | Risk: ${badge}`;
    }).join('\n\n');

    const moreText = dProjects.length > limit 
      ? `\n\n*...plus ${dProjects.length - limit} more projects in ${matchedDistrict}. Type any Project ID for individual breakdown.*` 
      : `\n\n*Type any Project ID above to inspect detailed audit metrics.*`;

    return [
      `📍 **MPLADS Projects in ${matchedDistrict}, ${dProjects[0]?.State || 'India'} (${dProjects.length} Total Projects):**`,
      ``,
      `• **Total Sanctioned Allocation:** ${formatMoney(totalDSanctioned)}`,
      `• **Total Actual Expenditure:** ${formatMoney(totalDSpent)} (Utilization: ${((totalDSpent / (totalDSanctioned || 1)) * 100).toFixed(1)}%)`,
      `• **Delayed Projects:** ${dDelayed}`,
      `• **Flagged Risk:** 🔴 ${dCritical} Critical | 🟠 ${dHigh} High`,
      ``,
      wantsAll ? `**Complete Project Inventory for ${matchedDistrict}:**` : `**Key Projects in ${matchedDistrict}:**`,
      ``,
      projectRows,
      moreText
    ].join('\n');
  }

  if (matchedState) {
    const sProjects = contextData.allProjects
      .filter(p => (p.State || '').toLowerCase() === matchedState.toLowerCase())
      .sort((a, b) => (b.risk?.score || 0) - (a.risk?.score || 0));

    const totalSSanctioned = sProjects.reduce((acc, p) => acc + p.Sanctioned_Amount, 0);
    const totalSSpent = sProjects.reduce((acc, p) => acc + p.Actual_Expenditure, 0);
    const sDistricts = [...new Set(sProjects.map(p => p.District))].filter(Boolean);

    const sample = sProjects.slice(0, wantsAll ? 12 : 5).map((p, i) => 
      `${i + 1}. **${p.Project_ID}** — ${p.Project_Name} (${p.District})\n   • Budget: ${formatMoney(p.Sanctioned_Amount)} | Spent: ${formatMoney(p.Actual_Expenditure)} | Status: ${p.Status}`
    ).join('\n\n');

    return [
      `🗺️ **MPLADS Projects in State of ${matchedState} (${sProjects.length} Total):**`,
      ``,
      `• **Districts Active (${sDistricts.length}):** ${sDistricts.join(', ')}`,
      `• **Total Sanctioned Funds:** ${formatMoney(totalSSanctioned)}`,
      `• **Total Expenditure:** ${formatMoney(totalSSpent)}`,
      `• **Delayed Projects:** ${sProjects.filter(p => (p.Status || '').toLowerCase().includes('delay')).length}`,
      ``,
      `**Top Flagged Projects in ${matchedState}:**`,
      ``,
      sample,
      `\n*Ask about any specific district or project ID in ${matchedState}.*`
    ].join('\n');
  }

  // If user explicitly asks for an unknown or hypothetical location (e.g. "xyz location" or "in Paris")
  const locMatch = msgTrimmed.match(/(?:in|at|for)\s+(?:this\s+)?(?:the\s+)?(?:location\s+|district\s+|city\s+|area\s+|place\s+|state\s+)?([A-Za-z0-9\s_-]+?)(?:\s+location|\s+district|\s+area|\s+city|\s*\?|\s*$)/i);
  if (locMatch && locMatch[1]) {
    const candidate = locMatch[1].replace(/^(this|the|all|any)\s+/i, '').replace(/\s+(location|district|area|place|city)$/i, '').trim();
    const blacklist = ['all', 'the', 'project', 'projects', 'risk', 'delay', 'overrun', 'summary', 'overview', 'this'];
    if (candidate.length > 1 && !blacklist.includes(candidate.toLowerCase())) {
      return [
        `❌ **Location Not Found:** Could not find any projects for location **"${candidate}"** in the MPLADS database.`,
        ``,
        `📍 **Active Monitored Locations (32 Districts across 10 States):**`,
        `• **Uttarakhand:** Almora, Dehradun, Haridwar, Nainital, Pauri Garhwal, Udham Singh Nagar`,
        `• **Uttar Pradesh:** Agra, Kanpur Nagar, Lucknow, Meerut, Prayagraj, Varanasi`,
        `• **Rajasthan:** Ajmer, Jaipur, Jodhpur, Kota, Udaipur`,
        `• **Bihar:** Bhagalpur, Gaya, Muzaffarpur, Nalanda, Patna`,
        `• **Maharashtra:** Aurangabad, Nagpur, Nashik, Pune, Thane`,
        `• **Karnataka:** Bengaluru Urban | **Madhya Pradesh:** Bhopal | **Odisha:** Bhubaneswar | **Tamil Nadu:** Chennai | **West Bengal:** Kolkata`,
        ``,
        `💡 *Try asking:* *"List all projects in Almora"* or *"Show projects in Dehradun"*`
      ].join('\n');
    }
  }

  // =========================================================================
  // 8. RISK LEVEL QUERIES (Critical, High, Medium, Low)
  // =========================================================================
  if (msgLower.includes('risk') || msgLower.includes('critical') || msgLower.includes('low risk') ||
      msgLower.includes('medium risk') || msgLower.includes('high risk')) {

    let targetLevel = 'HIGH/CRITICAL';
    let filterFn = (p) => p.risk?.risk_level === 'CRITICAL' || p.risk?.risk_level === 'HIGH';

    if (msgLower.includes('low risk') || (msgLower.includes('low') && msgLower.includes('risk'))) {
      targetLevel = 'LOW';
      filterFn = (p) => p.risk?.risk_level === 'LOW';
    } else if (msgLower.includes('medium risk') || (msgLower.includes('medium') && msgLower.includes('risk'))) {
      targetLevel = 'MEDIUM';
      filterFn = (p) => p.risk?.risk_level === 'MEDIUM';
    } else if (msgLower.includes('critical')) {
      targetLevel = 'CRITICAL';
      filterFn = (p) => p.risk?.risk_level === 'CRITICAL';
    }

    const matched = contextData.allProjects.filter(filterFn);
    const emoji = targetLevel.includes('LOW') ? '🟢' : targetLevel.includes('MEDIUM') ? '🟡' : '🔴';

    if (matched.length > 0) {
      const list = matched.slice(0, 5).map((p, i) => 
        `${emoji} **${i + 1}. ${p.Project_ID} — ${p.Project_Name}**\n   • **District:** ${p.District} (${p.State})\n   • **Sanctioned:** ${formatMoney(p.Sanctioned_Amount)} | **Spent:** ${formatMoney(p.Actual_Expenditure)}\n   • **Progress:** Physical: ${p.Physical_Progress}% | Financial: ${p.Financial_Progress}%\n   • **Status:** ${p.Status}`
      ).join('\n\n');

      return `${emoji} **${targetLevel} Risk Projects (${matched.length} projects in scope):**\n\n${list}\n\n*Type any Project ID above for full audit details.*`;
    }
    return `${emoji} No projects currently categorized under **${targetLevel}** risk.`;
  }

  // =========================================================================
  // 9. DELAYED PROJECTS
  // =========================================================================
  if (/\b(delay|delayed|late|behind schedule)\b/i.test(msgLower)) {
    const delayedProjects = contextData.allProjects.filter(p => (p.Status || '').toLowerCase().includes('delay'));
    if (delayedProjects.length > 0) {
      const delayedList = delayedProjects.slice(0, 5).map((p, i) => 
        `⏱️ **${i + 1}. ${p.Project_ID} — ${p.Project_Name}**\n   • **District:** ${p.District}, ${p.State} | **Agency:** ${p.Implementing_Agency}\n   • **Progress:** ${p.Physical_Progress}% physical | Expected by: ${formatDate(p.Expected_Completion)}`
      ).join('\n\n');

      return `⏱️ **Delayed Projects in Your Jurisdiction (${delayedProjects.length} total):**\n\n${delayedList}\n\n*All delayed projects are tracked for timeline remediation.*`;
    }
    return `✅ No projects are currently reported as delayed in your scope.`;
  }

  // =========================================================================
  // 10. COMPLETED OR IN PROGRESS STATUS QUERIES
  // =========================================================================
  if (/\b(completed projects|finished projects|how many completed)\b/i.test(msgLower)) {
    const completed = contextData.allProjects.filter(p => (p.Status || '').toLowerCase() === 'completed');
    return `✅ **Completed Projects:** **${completed.length} projects** out of ${contextData.totalScanned} are completed (100% physical delivery).`;
  }

  // =========================================================================
  // 11. GENERAL SUMMARY / JURISDICTION OVERVIEW
  // =========================================================================
  if (/\b(summary|overview|total|statistics|stats|how many projects|fund utilization)\b/i.test(msgLower)) {
    return [
      `📊 **MPLADS Intelligence Jurisdiction Overview**`,
      ``,
      `• **Total Projects Monitored:** **${contextData.totalScanned}**`,
      `• **Total Sanctioned Allocation:** **${formatMoney(contextData.summary.total_sanctioned)}**`,
      `• **Total Actual Expenditure:** **${formatMoney(contextData.summary.total_expenditure)}**`,
      `• **Fund Utilization Rate:** **${contextData.summary.utilization_percentage.toFixed(1)}%**`,
      `• **AI Anomalies Detected:** **${contextData.summary.anomalies_count}**`,
      `• **Delayed Projects:** **${contextData.allProjects.filter(p => (p.Status || '').toLowerCase().includes('delay')).length}**`,
      `• **Critical/High Risk Projects:** **${contextData.allProjects.filter(p => p.risk?.risk_level === 'CRITICAL' || p.risk?.risk_level === 'HIGH').length}**`,
    ].join('\n');
  }

  // =========================================================================
  // 12. GREETINGS & NATURAL CAPABILITY GUIDES
  // =========================================================================
  if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening|who are you|help)\b/i.test(msgLower)) {
    return [
      `👋 **Hello! I am CivicShield AI**, your specialized MPLADS intelligence assistant.`,
      ``,
      `I can instantly answer anything regarding your projects across India. You can ask me:`,
      ``,
      `• **Project Lookups:** *"Tell me about MPL-2026-2002"* or *"Details of project 2002"*`,
      `• **Specific Project Questions:**`,
      `  — *"What is the budget of MPL-2026-2002?"*`,
      `  — *"Who is the agency for MPL-2026-2002?"*`,
      `  — *"What is the progress of MPL-2026-2002?"*`,
      `  — *"Why is project MPL-2026-1000 flagged?"*`,
      `• **By Sector:** *"Show education projects"* or *"Show healthcare works"*`,
      `• **By District:** *"Projects in Almora"* or *"Show projects in Dehradun"*`,
      `• **Financial Checks:** *"Which projects have cost overruns?"* or *"Most expensive project"*`,
      `• **Delays & Progress:** *"Show delayed projects"* or *"Lowest progress projects"*`,
      ``,
      `What would you like to inspect?`
    ].join('\n');
  }

  // Fallback assistant response
  return [
    `🤖 **CivicShield AI Assistant**`,
    ``,
    `I am actively monitoring **${contextData.totalScanned} projects**. You can ask me:`,
    `• A Project ID: *"details related to project id MPL-2026-2002"*`,
    `• A specific attribute: *"budget of MPL-2026-2002"* or *"agency for MPL-2026-2002"*`,
    `• Sector insights: *"show road projects"* or *"show water supply projects"*`,
    `• Location insights: *"projects in Nainital"* or *"projects in Prayagraj"*`,
    `• Risks & Delays: *"show cost overruns"* or *"show delayed projects"*`
  ].join('\n');
}

module.exports = {
  generateChatResponse
};
