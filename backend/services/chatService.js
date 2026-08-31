const financialAnalytics = require('./financialAnalytics');

/**
 * Enriches a raw project with calculated risk score and level
 */
function enrichWithRisk(proj) {
  const risk = financialAnalytics.calculateRiskScore(proj);
  return {
    ...proj,
    Risk_Score: risk.score,
    Risk_Level: risk.risk_level
  };
}

/**
 * Searches the in-memory CSV data for context relevant to the user's message
 */
function retrieveContext(message, userContext) {
  const msgLower = message.toLowerCase();
  
  // Use getter function to always get the live, populated array
  const allProjects = financialAnalytics.getProjectsData();

  // Base data filtered by user scope
  let scopedProjects = allProjects;
  if (userContext.role === 'state') {
    scopedProjects = allProjects.filter(p => p.State === userContext.state);
  }
  // MP and district see all projects in demo (CSV has no Constituency column)

  const contextData = {
    totalScanned: scopedProjects.length,
    matchedProjects: [],
    summary: financialAnalytics.getFinancialSummary(userContext.role === 'state' ? userContext.state : '', '')
  };

  // Extract potential Project IDs (e.g. MPL-2026-1030)
  const idMatch = message.match(/MPL-\d{4}-\d{3,4}/i);
  if (idMatch) {
    const proj = scopedProjects.find(p => p.Project_ID.toUpperCase() === idMatch[0].toUpperCase());
    if (proj) contextData.matchedProjects.push(enrichWithRisk(proj));
  }

  // Look for district names
  const districts = [...new Set(scopedProjects.map(p => p.District))].filter(Boolean);
  for (const d of districts) {
    if (msgLower.includes(d.toLowerCase())) {
      const districtProjects = scopedProjects.map(enrichWithRisk).filter(p => p.District === d);
      // Grab top 3 highest risk in this district
      const highRisk = districtProjects
        .sort((a, b) => b.Risk_Score - a.Risk_Score)
        .slice(0, 3);
      highRisk.forEach(p => {
        if (!contextData.matchedProjects.find(existing => existing.Project_ID === p.Project_ID)) {
          contextData.matchedProjects.push(p);
        }
      });
    }
  }

  // Look for keywords
  if (msgLower.includes('delay') || msgLower.includes('late')) {
    const delayed = scopedProjects.filter(p => p.Status === 'Delayed').map(enrichWithRisk);
    delayed.forEach(p => {
        if (!contextData.matchedProjects.find(existing => existing.Project_ID === p.Project_ID)) {
          contextData.matchedProjects.push(p);
        }
    });
  }

  // Look for risk keywords — detect SPECIFIC level or default to HIGH+CRITICAL
  if (msgLower.includes('risk') || msgLower.includes('critical') || msgLower.includes('high risk') ||
      msgLower.includes('low risk') || msgLower.includes('medium risk')) {

    let targetLevels;
    if (msgLower.includes('low risk') || (msgLower.includes('low') && msgLower.includes('risk'))) {
      targetLevels = ['LOW'];
    } else if (msgLower.includes('medium risk') || (msgLower.includes('medium') && msgLower.includes('risk'))) {
      targetLevels = ['MEDIUM'];
    } else if (msgLower.includes('critical')) {
      targetLevels = ['CRITICAL'];
    } else {
      targetLevels = ['HIGH', 'CRITICAL'];
    }

    const risky = scopedProjects.map(enrichWithRisk)
      .filter(p => targetLevels.includes(p.Risk_Level))
      .sort((a, b) => b.Risk_Score - a.Risk_Score);
    risky.forEach(p => {
      if (!contextData.matchedProjects.find(existing => existing.Project_ID === p.Project_ID)) {
        contextData.matchedProjects.push(p);
      }
    });
    // Store the detected level for use in the response
    contextData.detectedRiskLevel = targetLevels.join('/');
  }

  return contextData;
}

/**
 * Generates a prompt for the LLM using the retrieved context
 */
function buildPrompt(message, userContext, contextData) {
  let prompt = `You are CivicShield AI, an intelligent assistant for the MPLADS Fraud Detection dashboard.
You must answer the user's question accurately using ONLY the provided context data below.
Do not invent or hallucinate financial values, project IDs, or risk scores.
Keep responses concise, professional, and directly address the question.

USER ROLE: ${userContext.role}
USER STATE/AUTHORITY: ${userContext.state || 'National'}

--- RETRIEVED CONTEXT ---
Total Projects in Scope: ${contextData.totalScanned}
Overall Financial Summary: 
- Sanctioned: ₹${contextData.summary.total_sanctioned}
- Expended: ₹${contextData.summary.total_expenditure}
- Utilization: ${contextData.summary.utilization_percentage}%
- Anomalies Detected: ${contextData.summary.anomalies_count}

Specific Projects Mentioned in Data:
`;

  if (contextData.matchedProjects.length === 0) {
    prompt += "No specific projects matched the query context.\n";
  } else {
    contextData.matchedProjects.forEach(p => {
      prompt += `- ID: ${p.Project_ID}, Name: ${p.Project_Name}, District: ${p.District}, Status: ${p.Status}, Risk: ${p.Risk_Level} (${p.Risk_Score}/100), Sanctioned: ₹${p.Sanctioned_Amount}, Expenditure: ₹${p.Actual_Expenditure}\n`;
    });
  }

  prompt += `\n--- USER QUESTION ---\n${message}\n\nAnswer the question using the context above.`;
  return prompt;
}

/**
 * Main chat handler
 */
async function generateChatResponse(message, userContext) {
  const contextData = retrieveContext(message, userContext);
  
  // Check for LLM API Key
  const geminiApiKey = process.env.GEMINI_API_KEY || ''; // Can be set in .env
  
  if (geminiApiKey) {
    try {
      const prompt = buildPrompt(message, userContext, contextData);
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        throw new Error('Gemini API Error: ' + response.statusText);
      }

      const data = await response.json();
      if (data.candidates && data.candidates.length > 0) {
        return data.candidates[0].content.parts[0].text;
      }
    } catch (err) {
      console.error("LLM API Failed, falling back to rule-based engine:", err.message);
      // Fall through to rule-based logic
    }
  }

  // --- RULE-BASED FALLBACK ENGINE ---
  const msgLower = message.toLowerCase();

  // Project ID lookup
  if (contextData.matchedProjects.length > 0 && msgLower.includes('mpl-')) {
    const p = contextData.matchedProjects[0];
    return [
      `📋 **Project Details — ${p.Project_ID}**`,
      ``,
      `• **Name:** ${p.Project_Name}`,
      `• **District:** ${p.District}`,
      `• **Status:** ${p.Status}`,
      `• **Risk Level:** ${p.Risk_Level} (Score: ${p.Risk_Score}/100)`,
      `• **Sanctioned Amount:** ₹${(p.Sanctioned_Amount / 100000).toFixed(2)} Lakh`,
      `• **Actual Expenditure:** ₹${(p.Actual_Expenditure / 100000).toFixed(2)} Lakh`,
      `• **Financial Progress:** ${p.Financial_Progress}%`,
      `• **Physical Progress:** ${p.Physical_Progress}%`,
    ].join('\n');
  }

  // Risk projects — detect any level mentioned
  if (msgLower.includes('risk') || msgLower.includes('critical') || msgLower.includes('low risk') ||
      msgLower.includes('medium risk') || msgLower.includes('high risk')) {

    const levelLabel = contextData.detectedRiskLevel || 'HIGH/CRITICAL';
    const emoji = levelLabel.includes('LOW') ? '🟢' : levelLabel.includes('MEDIUM') ? '🟡' : '🔴';

    if (contextData.matchedProjects.length > 0) {
      const list = contextData.matchedProjects.map((p, i) => [
        ``,
        `${emoji} **${i + 1}. ${p.Project_ID} — ${p.Project_Name}**`,
        `  • **District:** ${p.District} | **State:** ${p.State}`,
        `  • **Status:** ${p.Status}`,
        `  • **Risk Level:** ${p.Risk_Level} (Score: ${p.Risk_Score}/100)`,
        `  • **Sanctioned:** ₹${(p.Sanctioned_Amount / 100000).toFixed(2)} Lakh`,
        `  • **Expenditure:** ₹${(p.Actual_Expenditure / 100000).toFixed(2)} Lakh`,
        `  • **Financial Progress:** ${p.Financial_Progress}% | **Physical Progress:** ${p.Physical_Progress}%`,
      ].join('\n')).join('\n');
      return `${emoji} **${levelLabel} Risk Projects in Your Jurisdiction (${contextData.matchedProjects.length} total):**\n${list}`;
    }
    return [
      `${emoji} **${levelLabel} Risk Summary**`,
      ``,
      `• No projects found matching **${levelLabel}** risk level.`,
      `• Try asking for: **low risk**, **medium risk**, **high risk**, or **critical** projects.`,
    ].join('\n');
  }

  // Summary / count queries
  if (msgLower.includes('summary') || msgLower.includes('total') || msgLower.includes('overview') || msgLower.includes('how many') || msgLower.includes('count')) {
    return [
      `📊 **Jurisdiction Overview**`,
      ``,
      `• **Total Projects:** ${contextData.totalScanned}`,
      `• **Total Sanctioned:** ₹${(contextData.summary.total_sanctioned / 10000000).toFixed(2)} Cr`,
      `• **Total Expenditure:** ₹${(contextData.summary.total_expenditure / 10000000).toFixed(2)} Cr`,
      `• **Fund Utilization:** ${contextData.summary.utilization_percentage.toFixed(1)}%`,
      `• **Anomalies Detected:** ${contextData.summary.anomalies_count}`,
    ].join('\n');
  }

  // Delayed projects
  if (msgLower.includes('delay')) {
    if (contextData.matchedProjects.length > 0) {
      const delayedList = contextData.matchedProjects
        .filter(p => p.Status === 'Delayed')
        .map(p => `  • **${p.Project_ID}** — ${p.Project_Name} (${p.District}) | Risk: ${p.Risk_Level} (${p.Risk_Score}/100)`)
        .join('\n');
      if (delayedList) {
        return `⏱️ **Delayed Projects in Your Jurisdiction:**\n\n${delayedList}`;
      }
    }
    const allProjects = financialAnalytics.getProjectsData();
    const delayedCount = allProjects.filter(p => p.Status === 'Delayed').length;
    return [
      `⏱️ **Delayed Projects Summary**`,
      ``,
      `• **Total Delayed:** ${delayedCount} projects`,
      `• Visit the **Delayed Projects** section for the complete list.`,
    ].join('\n');
  }

  // High-risk handled above

  return [
    `🤖 **CivicShield AI — Fallback Mode**`,
    ``,
    `• **Projects in scope:** ${contextData.totalScanned}`,
    `• You can ask me about:`,
    `  — A specific project (e.g., "tell me about MPL-2026-1000")`,
    `  — Delays (e.g., "show delayed projects")`,
    `  — Risk (e.g., "show high risk projects")`,
    `  — Overview (e.g., "give me a summary")`,
  ].join('\n');
}

module.exports = {
  generateChatResponse
};
