const { pool } = require('../config/db');
const { getFinancialAlerts, getProjectById } = require('./financialAnalytics');

const getQueue = async (state, district) => {
  // Get all flagged projects from CSV/AI engine
  // getFinancialAlerts already sorts by highest risk score first
  const flaggedProjects = await getFinancialAlerts(state, district);

  if (flaggedProjects.length === 0) return [];

  // Fetch all existing verification workflows from MySQL
  const [rows] = await pool.query('SELECT * FROM verification_workflow');
  const workflowMap = {};
  rows.forEach(r => {
    workflowMap[r.project_id] = r;
  });

  // Merge workflow state into the flagged projects
  return flaggedProjects.map(p => {
    const workflow = workflowMap[p.Project_ID] || {
      status: 'Pending Verification',
      assigned_officer: null,
      priority: p.risk.risk_level,
      due_date: null,
      findings: null,
      officer_remarks: null,
      inspection_result: null,
      final_decision: null,
      checklist: {},
      evidence: []
    };
    return { ...p, workflow };
  });
};

const getProjectDetails = async (projectId) => {
  const project = await getProjectById(projectId);
  if (!project) return null;

  const [rows] = await pool.query('SELECT * FROM verification_workflow WHERE project_id = ?', [projectId]);
  let workflow = rows[0];

  if (!workflow) {
    workflow = {
      status: 'Pending Verification',
      assigned_officer: null,
      priority: project.risk.risk_level,
      due_date: null,
      findings: null,
      officer_remarks: null,
      inspection_result: null,
      final_decision: null,
      checklist: {
        financial: { sanction: false, expenditure: false, payment: false, bills: false },
        project: { physical: false, location: false, asset: false, compare: false },
        compliance: { documents: false, conditions: false, agency: false }
      },
      evidence: []
    };
  } else {
    // Parse JSON fields
    if (typeof workflow.checklist === 'string') workflow.checklist = JSON.parse(workflow.checklist);
    if (typeof workflow.evidence === 'string') workflow.evidence = JSON.parse(workflow.evidence);
  }

  return { ...project, workflow };
};

const updateStatus = async (projectId, status) => {
  await pool.query(
    `INSERT INTO verification_workflow (project_id, status) VALUES (?, ?) 
     ON DUPLICATE KEY UPDATE status = VALUES(status)`,
    [projectId, status]
  );
  return { success: true };
};

const assignOfficer = async (projectId, data) => {
  const { assigned_officer, priority, due_date } = data;
  await pool.query(
    `INSERT INTO verification_workflow (project_id, status, assigned_officer, priority, due_date) 
     VALUES (?, 'Assigned', ?, ?, ?) 
     ON DUPLICATE KEY UPDATE 
       status = 'Assigned', 
       assigned_officer = VALUES(assigned_officer), 
       priority = VALUES(priority), 
       due_date = VALUES(due_date)`,
    [projectId, assigned_officer, priority, due_date]
  );
  return { success: true };
};

const submitFindings = async (projectId, data) => {
  const { findings, officer_remarks, inspection_result, final_decision, checklist, evidence } = data;
  
  // Map decision to status
  let newStatus = 'Under Verification';
  if (final_decision === 'Verified - No Issue') newStatus = 'Closed';
  if (final_decision === 'Irregularity Found') newStatus = 'Irregularity Found';
  if (final_decision === 'Escalated') newStatus = 'Escalated';

  await pool.query(
    `INSERT INTO verification_workflow (project_id, status, findings, officer_remarks, inspection_result, final_decision, checklist, evidence) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
     ON DUPLICATE KEY UPDATE 
       status = VALUES(status),
       findings = VALUES(findings),
       officer_remarks = VALUES(officer_remarks),
       inspection_result = VALUES(inspection_result),
       final_decision = VALUES(final_decision),
       checklist = VALUES(checklist),
       evidence = VALUES(evidence)`,
    [
      projectId, 
      newStatus, 
      findings, 
      officer_remarks, 
      inspection_result, 
      final_decision, 
      JSON.stringify(checklist || {}), 
      JSON.stringify(evidence || [])
    ]
  );
  return { success: true, status: newStatus };
};

module.exports = {
  getQueue,
  getProjectDetails,
  updateStatus,
  assignOfficer,
  submitFindings
};
